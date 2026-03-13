import { AudioEngine } from "../audio/audioEngine.js";
import { AudioAnalyser } from "../audio/analyser.js";
import { APP_CONFIG } from "./config.js";

function mustGetElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }

  return element;
}

async function bootstrap() {
  const fileInput = mustGetElement(APP_CONFIG.ui.fileInputId);
  const playButton = mustGetElement(APP_CONFIG.ui.playButtonId);
  const pauseButton = mustGetElement(APP_CONFIG.ui.pauseButtonId);
  const statusNode = mustGetElement(APP_CONFIG.ui.statusId);
  const analysisOutput = mustGetElement(APP_CONFIG.ui.analysisOutputId);

  const audioEngine = new AudioEngine();
  let analyser = null;

  let animationFrameId = null;
  let lastLogTime = 0;
  let hasLoadedFile = false;

  const setStatus = (message) => {
    statusNode.textContent = `Status: ${message}`;
  };

  const updateButtons = () => {
    playButton.disabled = !hasLoadedFile;
    pauseButton.disabled = !hasLoadedFile;
  };

  const renderAnalysis = (values) => {
    analysisOutput.textContent = JSON.stringify(values, null, 2);
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

    return analyser;
  };

  const stopAnalysisLoop = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  const analysisFrame = (timestamp) => {
    const audioElement = audioEngine.getAudioElement();
    if (!audioElement || audioElement.paused || audioElement.ended || !analyser) {
      stopAnalysisLoop();
      return;
    }

    const values = analyser.getAnalysis();
    renderAnalysis(values);

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

  fileInput.addEventListener("change", async (event) => {
    const target = event.target;
    const file = target.files && target.files[0];

    if (!file) {
      hasLoadedFile = false;
      updateButtons();
      setStatus("waiting for file");
      renderAnalysis({ bass: 0, mid: 0, treble: 0, amplitude: 0 });
      return;
    }

    try {
      await audioEngine.loadFile(file, APP_CONFIG.analyser);
      await ensureAnalyser();
      hasLoadedFile = true;
      updateButtons();
      setStatus(`loaded ${file.name}`);
      renderAnalysis({ bass: 0, mid: 0, treble: 0, amplitude: 0 });
    } catch (error) {
      hasLoadedFile = false;
      updateButtons();
      setStatus(error.message);
      console.error("Failed to load file", error);
    }
  });

  playButton.addEventListener("click", async () => {
    if (!hasLoadedFile) {
      setStatus("select file first");
      return;
    }

    try {
      await ensureAnalyser();
      await audioEngine.play();
      setStatus("playing");
      startAnalysisLoop();
    } catch (error) {
      setStatus(error.message);
      console.error("Play failed", error);
    }
  });

  pauseButton.addEventListener("click", () => {
    audioEngine.pause();
    setStatus("paused");
    stopAnalysisLoop();
  });

  updateButtons();

  window.vizuPlayer = {
    config: APP_CONFIG,
    audioEngine,
    play: () => audioEngine.play(),
    pause: () => audioEngine.pause(),
    getAnalysis: () => (analyser ? analyser.getAnalysis() : null),
  };
}

bootstrap().catch((error) => {
  console.error("Failed to bootstrap VizuPlayer", error);
});
