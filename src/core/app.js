import { AudioEngine } from "../audio/audioEngine.js";
import { AudioAnalyser } from "../audio/analyser.js";
import { MusicPlayer, PLAYER_PHASES } from "../audio/musicPlayer.js";
import { Visualizer } from "../visual/visualizer.js";
import { APP_CONFIG } from "./config.js";
import { PlayerUI } from "../ui/playerUI.js";

const ZERO_ANALYSIS = Object.freeze({
  bass: 0,
  mid: 0,
  treble: 0,
  amplitude: 0,
});

const DEFAULT_STATUS_BY_PHASE = Object.freeze({
  [PLAYER_PHASES.IDLE]: "waiting for track",
  [PLAYER_PHASES.LOADING]: "loading track...",
  [PLAYER_PHASES.READY]: "track ready",
  [PLAYER_PHASES.PLAYING]: "playing",
  [PLAYER_PHASES.PAUSED]: "paused",
  [PLAYER_PHASES.ENDED]: "ended",
  [PLAYER_PHASES.ERROR]: "error",
});

const API_COMMANDS = Object.freeze({
  LOAD_LOCAL_FILE: "load-local-file",
  LOAD_URL_TRACK: "load-url-track",
  LOAD_BUNDLED_DEMO_TRACK: "load-bundled-demo-track",
  PLAY: "play",
  PAUSE: "pause",
  STOP: "stop",
});

function createConsoleLogger(prefix) {
  return {
    info(eventName, payload = null) {
      if (payload) {
        console.info(`${prefix} ${eventName}`, payload);
        return;
      }

      console.info(`${prefix} ${eventName}`);
    },
  };
}

function sanitizeAnalysis(values) {
  return {
    bass: Number.isFinite(values?.bass) ? Math.round(values.bass) : 0,
    mid: Number.isFinite(values?.mid) ? Math.round(values.mid) : 0,
    treble: Number.isFinite(values?.treble) ? Math.round(values.treble) : 0,
    amplitude: Number.isFinite(values?.amplitude) ? Math.round(values.amplitude) : 0,
  };
}

function analysisKey(values) {
  return `${values.bass}|${values.mid}|${values.treble}|${values.amplitude}`;
}

function decayChannel(value, alpha) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const next = Math.round(safeValue * (1 - alpha));
  return next <= 1 ? 0 : next;
}

function decayAnalysis(values, alpha) {
  return {
    bass: decayChannel(values.bass, alpha),
    mid: decayChannel(values.mid, alpha),
    treble: decayChannel(values.treble, alpha),
    amplitude: decayChannel(values.amplitude, alpha),
  };
}

async function bootstrap() {
  const logger = createConsoleLogger("[VizuPlayer]");
  const audioEngine = new AudioEngine();
  const player = new MusicPlayer(audioEngine);
  const ui = new PlayerUI(APP_CONFIG.ui);
  ui.initialize(APP_CONFIG.playback.bundledDemoTrackUrl);

  const visualizer = new Visualizer({
    canvas: ui.getVisualizerCanvas(),
    barCount: APP_CONFIG.visualizer.barCount,
    network: APP_CONFIG.visualizer.network,
  });

  let analyser = null;
  let animationFrameId = null;
  let lastLogTime = 0;
  let endedListenerAttached = false;
  let currentAnalysis = { ...ZERO_ANALYSIS };
  let lastRenderedAnalysis = "";

  let loadRequestSequence = 0;
  let latestRequestedLoadId = 0;
  let queuedLoadRequest = null;
  let loadWorkerRunning = false;

  const renderAnalysisIfChanged = (values) => {
    const safeValues = sanitizeAnalysis(values);
    const key = analysisKey(safeValues);

    if (key === lastRenderedAnalysis) {
      return;
    }

    lastRenderedAnalysis = key;
    currentAnalysis = safeValues;
    ui.renderAnalysis(safeValues);
  };

  const setAnalysis = (values) => {
    renderAnalysisIfChanged(values);
  };

  const setStatusForPhase = (phase, override = "") => {
    if (typeof override === "string" && override.trim().length > 0) {
      ui.setStatus(override.trim());
      return;
    }

    ui.setStatus(DEFAULT_STATUS_BY_PHASE[phase] || DEFAULT_STATUS_BY_PHASE[PLAYER_PHASES.IDLE]);
  };

  const syncControls = () => {
    const state = player.getState();
    const phase = state.phase;
    const isLoading = phase === PLAYER_PHASES.LOADING;

    ui.setControls({
      canLoadLocal: !isLoading,
      canLoadUrl: !isLoading,
      canLoadDemo: !isLoading,
      canEditTrackUrl: !isLoading,
      canPlay: state.hasTrackLoaded
        && [
          PLAYER_PHASES.READY,
          PLAYER_PHASES.PAUSED,
          PLAYER_PHASES.ENDED,
          PLAYER_PHASES.ERROR,
        ].includes(phase),
      canPause: phase === PLAYER_PHASES.PLAYING,
      canStop: state.hasTrackLoaded && !isLoading,
    });
  };

  const applyPhase = (phase, statusOverride = "") => {
    player.setPhase(phase);
    setStatusForPhase(phase, statusOverride);
    syncControls();
  };

  const setErrorPhase = (error, { keepTrackLoaded = false } = {}) => {
    const message = error instanceof Error
      ? error.message
      : (typeof error === "string" ? error : "Action failed.");

    player.setError(message, { keepTrackLoaded });
    setAnalysis(ZERO_ANALYSIS);
    ui.setStatus(message);
    syncControls();

    return message;
  };

  const ensureAnalyser = async () => {
    if (analyser) {
      return analyser;
    }

    const graph = await audioEngine.initializeGraph(APP_CONFIG.analyser);

    analyser = new AudioAnalyser({
      analyserNode: graph.analyserNode,
      audioContext: graph.audioContext,
      bands: APP_CONFIG.analyser.bands,
    });

    if (!endedListenerAttached) {
      graph.audioElement.addEventListener("ended", () => {
        player.markEnded();
        setAnalysis(ZERO_ANALYSIS);
        setStatusForPhase(PLAYER_PHASES.ENDED);
        syncControls();
        logger.info("playback-ended", { source: audioEngine.getCurrentSource() });
      });

      endedListenerAttached = true;
    }

    return analyser;
  };

  const invalidatePendingLoads = () => {
    latestRequestedLoadId = ++loadRequestSequence;

    if (queuedLoadRequest) {
      queuedLoadRequest.resolve({ status: "cancelled" });
      queuedLoadRequest = null;
    }
  };

  const processLoadQueue = async () => {
    if (loadWorkerRunning) {
      return;
    }

    loadWorkerRunning = true;

    try {
      while (queuedLoadRequest) {
        const request = queuedLoadRequest;
        queuedLoadRequest = null;

        player.beginLoad();
        setAnalysis(ZERO_ANALYSIS);
        applyPhase(PLAYER_PHASES.LOADING, request.loadingStatus);

        try {
          await ensureAnalyser();
          await request.perform();

          if (latestRequestedLoadId !== request.requestId) {
            logger.info("stale-load-success-ignored", {
              requestId: request.requestId,
              latestRequestedLoadId,
            });
            request.resolve({ status: "stale" });
            continue;
          }

          player.commitTrackLoad({
            trackType: request.trackType,
            trackLabel: request.trackLabel,
          });

          setAnalysis(ZERO_ANALYSIS);
          applyPhase(PLAYER_PHASES.READY, request.successStatus);
          logger.info("track-loaded", request.logPayload());
          request.resolve({ status: "loaded" });
        } catch (error) {
          if (latestRequestedLoadId !== request.requestId) {
            logger.info("stale-load-error-ignored", {
              requestId: request.requestId,
              latestRequestedLoadId,
            });
            request.resolve({ status: "stale" });
            continue;
          }

          const message = setErrorPhase(error);
          logger.info("track-load-failed", {
            message,
            requestId: request.requestId,
          });
          request.reject(error instanceof Error ? error : new Error(message));
        }
      }
    } finally {
      loadWorkerRunning = false;
    }
  };

  const enqueueLatestLoad = ({
    trackType,
    trackLabel,
    loadingStatus,
    successStatus,
    perform,
    logPayload,
  }) => {
    const requestId = ++loadRequestSequence;
    latestRequestedLoadId = requestId;

    return new Promise((resolve, reject) => {
      if (queuedLoadRequest) {
        queuedLoadRequest.resolve({ status: "superseded" });
      }

      queuedLoadRequest = {
        requestId,
        trackType,
        trackLabel,
        loadingStatus,
        successStatus,
        perform,
        logPayload,
        resolve,
        reject,
      };

      processLoadQueue().catch((error) => {
        console.error("[VizuPlayer load worker failure]", error);
      });
    });
  };

  const ensureNotLoading = () => {
    if (player.getState().phase === PLAYER_PHASES.LOADING) {
      throw new Error("Track is currently loading.");
    }
  };

  const queueUrlLoad = (url, { loadingStatus, successStatus, mode }) => {
    const trimmedUrl = typeof url === "string" ? url.trim() : "";

    if (!trimmedUrl) {
      throw new Error("Enter a demo/url track first.");
    }

    return enqueueLatestLoad({
      trackType: "demo-url",
      trackLabel: trimmedUrl,
      loadingStatus,
      successStatus,
      perform: () => player.loadDemoTrack(trimmedUrl, APP_CONFIG.analyser, {
        timeoutMs: APP_CONFIG.playback.urlLoadTimeoutMs,
      }),
      logPayload: () => ({
        mode,
        url: trimmedUrl,
        source: audioEngine.getCurrentSource(),
      }),
    });
  };

  const commandHandlers = {
    async [API_COMMANDS.LOAD_LOCAL_FILE](payload = {}) {
      const file = payload.file;

      if (!(file instanceof File)) {
        ui.setStatus("no local file selected");
        syncControls();
        return { status: "ignored" };
      }

      return enqueueLatestLoad({
        trackType: "local",
        trackLabel: file.name,
        loadingStatus: `loading local file: ${file.name}`,
        successStatus: `loaded local file: ${file.name}`,
        perform: () => player.loadLocalFile(file, APP_CONFIG.analyser),
        logPayload: () => ({
          mode: "local",
          name: file.name,
          source: audioEngine.getCurrentSource(),
        }),
      });
    },

    async [API_COMMANDS.LOAD_URL_TRACK](payload = {}) {
      return queueUrlLoad(payload.url, {
        loadingStatus: "loading demo/url track...",
        successStatus: "loaded demo/url track",
        mode: "demo-url",
      });
    },

    async [API_COMMANDS.LOAD_BUNDLED_DEMO_TRACK]() {
      const demoUrl = APP_CONFIG.playback.bundledDemoTrackUrl;
      ui.setTrackUrl(demoUrl);

      return queueUrlLoad(demoUrl, {
        loadingStatus: "loading bundled demo track...",
        successStatus: "loaded bundled demo track",
        mode: "bundled-demo",
      });
    },

    async [API_COMMANDS.PLAY]() {
      ensureNotLoading();

      try {
        await ensureAnalyser();
        await player.play();
        applyPhase(PLAYER_PHASES.PLAYING);
        logger.info("playback-started", { source: audioEngine.getCurrentSource() });
        return { status: "playing" };
      } catch (error) {
        const keepTrackLoaded = player.getState().hasTrackLoaded;
        const message = setErrorPhase(error, { keepTrackLoaded });
        logger.info("playback-start-failed", { message });
        throw error instanceof Error ? error : new Error(message);
      }
    },

    async [API_COMMANDS.PAUSE]() {
      ensureNotLoading();
      const changed = player.pause();

      if (!changed) {
        return { status: "ignored" };
      }

      applyPhase(PLAYER_PHASES.PAUSED);
      logger.info("playback-paused");
      return { status: "paused" };
    },

    async [API_COMMANDS.STOP]() {
      const state = player.getState();

      if (state.phase === PLAYER_PHASES.LOADING) {
        invalidatePendingLoads();
        player.resetToIdle();
        setAnalysis(ZERO_ANALYSIS);
        applyPhase(PLAYER_PHASES.IDLE, "stopped");
        logger.info("load-cancelled-by-stop");
        return { status: "stopped-loading" };
      }

      const changed = player.stop();
      setAnalysis(ZERO_ANALYSIS);

      if (changed) {
        applyPhase(PLAYER_PHASES.READY, "stopped");
        logger.info("playback-stopped");
        return { status: "stopped" };
      }

      applyPhase(PLAYER_PHASES.IDLE, "nothing to stop");
      return { status: "ignored" };
    },
  };

  const executeCommand = async (command, payload = {}) => {
    const handler = commandHandlers[command];

    if (typeof handler !== "function") {
      throw new Error(`Unsupported command: ${command}`);
    }

    return handler(payload);
  };

  const renderFrame = (timestamp) => {
    const state = player.getState();
    const phase = state.phase;
    let frameAnalysis = ZERO_ANALYSIS;
    let spectrumData = null;

    if (phase === PLAYER_PHASES.PLAYING && analyser) {
      const frame = analyser.sampleFrame();
      frameAnalysis = sanitizeAnalysis(frame.analysis);
      spectrumData = frame.frequencyData;

      if (APP_CONFIG.analyser.enableLogging
        && timestamp - lastLogTime >= APP_CONFIG.analyser.logIntervalMs) {
        lastLogTime = timestamp;
        console.log("[VizuPlayer analysis]", frameAnalysis);
      }
    } else if (phase === PLAYER_PHASES.PAUSED) {
      frameAnalysis = decayAnalysis(currentAnalysis, APP_CONFIG.visualizer.pausedAnalysisDecayAlpha);
    } else {
      frameAnalysis = ZERO_ANALYSIS;
    }

    setAnalysis(frameAnalysis);

    visualizer.setFrameData({
      analysis: frameAnalysis,
      spectrumData: phase === PLAYER_PHASES.PLAYING ? spectrumData : null,
      isPlaying: phase === PLAYER_PHASES.PLAYING,
    });
    visualizer.render(timestamp);

    animationFrameId = requestAnimationFrame(renderFrame);
  };

  const startRenderLoop = () => {
    if (animationFrameId === null) {
      animationFrameId = requestAnimationFrame(renderFrame);
    }
  };

  const stopRenderLoop = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  ui.bindEvents({
    onLocalFileSelected: (file) => executeCommand(API_COMMANDS.LOAD_LOCAL_FILE, { file }),
    onLoadUrlTrack: (url) => executeCommand(API_COMMANDS.LOAD_URL_TRACK, { url }),
    onLoadBundledDemoTrack: () => executeCommand(API_COMMANDS.LOAD_BUNDLED_DEMO_TRACK),
    onPlay: () => executeCommand(API_COMMANDS.PLAY),
    onPause: () => executeCommand(API_COMMANDS.PAUSE),
    onStop: () => executeCommand(API_COMMANDS.STOP),
  });

  applyPhase(PLAYER_PHASES.IDLE);
  setAnalysis(ZERO_ANALYSIS);
  startRenderLoop();

  window.addEventListener("beforeunload", () => {
    stopRenderLoop();
    visualizer.destroy();
  });

  window.vizuPlayer = {
    config: APP_CONFIG,
    commands: Object.freeze({
      play: () => executeCommand(API_COMMANDS.PLAY),
      pause: () => executeCommand(API_COMMANDS.PAUSE),
      stop: () => executeCommand(API_COMMANDS.STOP),
      loadDemoTrack: (url) => executeCommand(API_COMMANDS.LOAD_URL_TRACK, { url }),
      loadBundledDemoTrack: () => executeCommand(API_COMMANDS.LOAD_BUNDLED_DEMO_TRACK),
      loadLocalFile: (file) => executeCommand(API_COMMANDS.LOAD_LOCAL_FILE, { file }),
    }),
    play: () => executeCommand(API_COMMANDS.PLAY),
    pause: () => executeCommand(API_COMMANDS.PAUSE),
    stop: () => executeCommand(API_COMMANDS.STOP),
    loadDemoTrack: (url) => executeCommand(API_COMMANDS.LOAD_URL_TRACK, { url }),
    loadBundledDemoTrack: () => executeCommand(API_COMMANDS.LOAD_BUNDLED_DEMO_TRACK),
    loadLocalFile: (file) => executeCommand(API_COMMANDS.LOAD_LOCAL_FILE, { file }),
    getState: () => player.getState(),
    getAnalysis: () => ({ ...currentAnalysis }),
    audioEngine,
    ui,
    visualizer,
  };
}

bootstrap().catch((error) => {
  console.error("Failed to bootstrap VizuPlayer", error);
});
