import { AudioEngine } from "../audio/audioEngine.js";
import { AudioAnalyser } from "../audio/analyser.js";
import { MusicPlayer } from "../audio/musicPlayer.js";
import { Visualizer } from "../visual/visualizer.js";
import { APP_CONFIG } from "./config.js";
import { PlayerUI } from "../ui/playerUI.js";

const ZERO_ANALYSIS = Object.freeze({
  bass: 0,
  mid: 0,
  treble: 0,
  amplitude: 0,
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

  const syncControls = () => {
    const state = player.getState();
    ui.setControls({
      canLoadUrl: true,
      canLoadDemo: true,
      canPlay: state.hasTrackLoaded && !state.isPlaying,
      canPause: state.hasTrackLoaded && state.isPlaying,
      canStop: state.hasTrackLoaded,
    });
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
        ui.setStatus("ended");
        syncControls();
        logger.info("playback-ended", { source: audioEngine.getCurrentSource() });
      });

      endedListenerAttached = true;
    }

    return analyser;
  };

  const renderFrame = (timestamp) => {
    const state = player.getState();
    let frameAnalysis = currentAnalysis;
    let spectrumData = null;

    if (state.isPlaying && analyser) {
      const frame = analyser.sampleFrame();
      frameAnalysis = sanitizeAnalysis(frame.analysis);
      spectrumData = frame.frequencyData;
      setAnalysis(frameAnalysis);

      if (timestamp - lastLogTime >= APP_CONFIG.analyser.logIntervalMs) {
        lastLogTime = timestamp;
        console.log("[VizuPlayer analysis]", frameAnalysis);
      }
    } else if (!state.hasTrackLoaded) {
      frameAnalysis = ZERO_ANALYSIS;
      setAnalysis(ZERO_ANALYSIS);
    }

    visualizer.setFrameData({
      analysis: frameAnalysis,
      spectrumData,
      isPlaying: state.isPlaying,
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

  const handleTrackLoaded = (statusMessage, logPayload) => {
    setAnalysis(ZERO_ANALYSIS);
    ui.setStatus(statusMessage);
    syncControls();
    logger.info("track-loaded", logPayload);
  };

  const handleActionFailure = () => {
    if (!player.getState().hasTrackLoaded) {
      setAnalysis(ZERO_ANALYSIS);
    }

    syncControls();
  };

  ui.bindEvents({
    onLocalFileSelected: async (file) => {
      if (!file) {
        ui.setStatus("no local file selected");
        syncControls();
        return;
      }

      try {
        await ensureAnalyser();
        await player.loadLocalFile(file, APP_CONFIG.analyser);

        handleTrackLoaded(`loaded local file: ${file.name}`, {
          mode: "local",
          name: file.name,
          source: audioEngine.getCurrentSource(),
        });
      } catch (error) {
        handleActionFailure();
        throw error;
      }
    },

    onLoadUrlTrack: async (url) => {
      const trimmedUrl = typeof url === "string" ? url.trim() : "";
      if (!trimmedUrl) {
        throw new Error("Enter a demo/url track first.");
      }

      try {
        await ensureAnalyser();
        await player.loadDemoTrack(trimmedUrl, APP_CONFIG.analyser);

        handleTrackLoaded("loaded demo/url track", {
          mode: "demo-url",
          url: trimmedUrl,
          source: audioEngine.getCurrentSource(),
        });
      } catch (error) {
        handleActionFailure();
        throw error;
      }
    },

    onLoadBundledDemoTrack: async () => {
      const demoUrl = APP_CONFIG.playback.bundledDemoTrackUrl;
      ui.setTrackUrl(demoUrl);

      try {
        await ensureAnalyser();
        await player.loadDemoTrack(demoUrl, APP_CONFIG.analyser);

        handleTrackLoaded("loaded bundled demo track", {
          mode: "bundled-demo",
          url: demoUrl,
          source: audioEngine.getCurrentSource(),
        });
      } catch (error) {
        handleActionFailure();
        throw error;
      }
    },

    onPlay: async () => {
      try {
        await ensureAnalyser();
        await player.play();

        ui.setStatus("playing");
        syncControls();
        logger.info("playback-started", { source: audioEngine.getCurrentSource() });
      } catch (error) {
        handleActionFailure();
        throw error;
      }
    },

    onPause: async () => {
      player.pause();
      ui.setStatus("paused");
      syncControls();
      logger.info("playback-paused");
    },

    onStop: async () => {
      player.stop();
      setAnalysis(ZERO_ANALYSIS);
      ui.setStatus("stopped");
      syncControls();
      logger.info("playback-stopped");
    },
  });

  syncControls();
  setAnalysis(ZERO_ANALYSIS);
  startRenderLoop();

  window.addEventListener("beforeunload", () => {
    stopRenderLoop();
    visualizer.destroy();
  });

  window.vizuPlayer = {
    config: APP_CONFIG,
    audioEngine,
    player,
    ui,
    visualizer,
    play: () => player.play(),
    pause: () => player.pause(),
    stop: () => player.stop(),
    loadDemoTrack: (url) => player.loadDemoTrack(url, APP_CONFIG.analyser),
    loadLocalFile: (file) => player.loadLocalFile(file, APP_CONFIG.analyser),
    getAnalysis: () => ({ ...currentAnalysis }),
  };
}

bootstrap().catch((error) => {
  console.error("Failed to bootstrap VizuPlayer", error);
});
