import { AudioEngine } from "../audio/audioEngine.js";
import { AudioAnalyser } from "../audio/analyser.js";
import { MusicPlayer } from "../audio/musicPlayer.js";
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

async function bootstrap() {
  const logger = createConsoleLogger("[VizuPlayer]");
  const audioEngine = new AudioEngine();
  const player = new MusicPlayer(audioEngine);
  const ui = new PlayerUI(APP_CONFIG.ui);
  ui.initialize(APP_CONFIG.playback.bundledDemoTrackUrl);

  let analyser = null;
  let animationFrameId = null;
  let lastLogTime = 0;
  let endedListenerAttached = false;

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

  const stopAnalysisLoop = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  const resetAnalysisDisplayIfNoTrack = () => {
    if (!player.getState().hasTrackLoaded) {
      ui.renderAnalysis(ZERO_ANALYSIS);
    }
  };

  const analysisFrame = (timestamp) => {
    const state = player.getState();
    if (!state.isPlaying || !analyser) {
      stopAnalysisLoop();
      return;
    }

    const values = analyser.getAnalysis();
    ui.renderAnalysis(values);

    if (timestamp - lastLogTime >= APP_CONFIG.analyser.logIntervalMs) {
      lastLogTime = timestamp;
      console.log("[VizuPlayer analysis]", values);
    }

    animationFrameId = requestAnimationFrame(analysisFrame);
  };

  const startAnalysisLoop = () => {
    if (animationFrameId === null) {
      animationFrameId = requestAnimationFrame(analysisFrame);
    }
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
        stopAnalysisLoop();
        ui.setStatus("ended");
        syncControls();
        logger.info("playback-ended", { source: audioEngine.getCurrentSource() });
      });

      endedListenerAttached = true;
    }

    return analyser;
  };

  const handleTrackLoaded = (statusMessage, logPayload) => {
    stopAnalysisLoop();
    ui.renderAnalysis(ZERO_ANALYSIS);
    ui.setStatus(statusMessage);
    syncControls();
    logger.info("track-loaded", logPayload);
  };

  const handleActionFailure = () => {
    stopAnalysisLoop();
    syncControls();
    resetAnalysisDisplayIfNoTrack();
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
        startAnalysisLoop();
        logger.info("playback-started", { source: audioEngine.getCurrentSource() });
      } catch (error) {
        handleActionFailure();
        throw error;
      }
    },

    onPause: async () => {
      player.pause();
      stopAnalysisLoop();
      ui.setStatus("paused");
      syncControls();
      logger.info("playback-paused");
    },

    onStop: async () => {
      player.stop();
      stopAnalysisLoop();
      ui.renderAnalysis(ZERO_ANALYSIS);
      ui.setStatus("stopped");
      syncControls();
      logger.info("playback-stopped");
    },
  });

  syncControls();

  window.vizuPlayer = {
    config: APP_CONFIG,
    audioEngine,
    player,
    ui,
    play: () => player.play(),
    pause: () => player.pause(),
    stop: () => player.stop(),
    loadDemoTrack: (url) => player.loadDemoTrack(url, APP_CONFIG.analyser),
    loadLocalFile: (file) => player.loadLocalFile(file, APP_CONFIG.analyser),
    getAnalysis: () => (analyser ? analyser.getAnalysis() : null),
  };
}

bootstrap().catch((error) => {
  console.error("Failed to bootstrap VizuPlayer", error);
});
