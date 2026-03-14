function mustGetElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }

  return element;
}

function mustGetCanvas(id) {
  const element = mustGetElement(id);
  if (!(element instanceof HTMLCanvasElement)) {
    throw new Error(`Element #${id} must be a <canvas>.`);
  }

  return element;
}

export class PlayerUI {
  constructor(ids) {
    this.ids = ids;
    this.fileInput = null;
    this.trackUrlInput = null;
    this.loadUrlButton = null;
    this.loadDemoButton = null;
    this.playButton = null;
    this.pauseButton = null;
    this.stopButton = null;
    this.statusNode = null;
    this.analysisBassNode = null;
    this.analysisMidNode = null;
    this.analysisTrebleNode = null;
    this.analysisAmplitudeNode = null;
    this.analysisOutputNode = null;
    this.visualizerCanvas = null;
  }

  initialize(defaultTrackUrl = "") {
    this.fileInput = mustGetElement(this.ids.fileInputId);
    this.trackUrlInput = mustGetElement(this.ids.trackUrlInputId);
    this.loadUrlButton = mustGetElement(this.ids.loadUrlButtonId);
    this.loadDemoButton = mustGetElement(this.ids.loadDemoButtonId);
    this.playButton = mustGetElement(this.ids.playButtonId);
    this.pauseButton = mustGetElement(this.ids.pauseButtonId);
    this.stopButton = mustGetElement(this.ids.stopButtonId);
    this.statusNode = mustGetElement(this.ids.statusId);
    this.analysisBassNode = mustGetElement(this.ids.analysisBassId);
    this.analysisMidNode = mustGetElement(this.ids.analysisMidId);
    this.analysisTrebleNode = mustGetElement(this.ids.analysisTrebleId);
    this.analysisAmplitudeNode = mustGetElement(this.ids.analysisAmplitudeId);
    this.analysisOutputNode = mustGetElement(this.ids.analysisOutputId);
    this.visualizerCanvas = mustGetCanvas(this.ids.visualizerCanvasId);

    this.setTrackUrl(defaultTrackUrl);
    this.renderAnalysis({ bass: 0, mid: 0, treble: 0, amplitude: 0 });
    this.setStatus("waiting for track");
    this.setControls({
      canLoadLocal: true,
      canLoadUrl: true,
      canLoadDemo: true,
      canEditTrackUrl: true,
      canPlay: false,
      canPause: false,
      canStop: false,
    });
  }

  bindEvents(handlers) {
    this.fileInput.addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
      this.runHandler(handlers.onLocalFileSelected, file).finally(() => {
        // Allow selecting the same file repeatedly after each handled change event.
        this.fileInput.value = "";
      });
    });

    this.loadUrlButton.addEventListener("click", () => {
      this.runHandler(handlers.onLoadUrlTrack, this.getTrackUrl());
    });

    this.loadDemoButton.addEventListener("click", () => {
      this.runHandler(handlers.onLoadBundledDemoTrack);
    });

    this.playButton.addEventListener("click", () => {
      this.runHandler(handlers.onPlay);
    });

    this.pauseButton.addEventListener("click", () => {
      this.runHandler(handlers.onPause);
    });

    this.stopButton.addEventListener("click", () => {
      this.runHandler(handlers.onStop);
    });
  }

  async runHandler(handler, ...args) {
    if (typeof handler !== "function") {
      return;
    }

    try {
      await handler(...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed.";
      this.setStatus(message);
      console.error("[VizuPlayer UI action failed]", error);
    }
  }

  getTrackUrl() {
    return this.trackUrlInput.value.trim();
  }

  getVisualizerCanvas() {
    return this.visualizerCanvas;
  }

  setTrackUrl(url) {
    this.trackUrlInput.value = typeof url === "string" ? url : "";
  }

  setStatus(message) {
    this.statusNode.textContent = `Status: ${message}`;
  }

  renderAnalysis(values) {
    const safeValues = {
      bass: Number.isFinite(values?.bass) ? values.bass : 0,
      mid: Number.isFinite(values?.mid) ? values.mid : 0,
      treble: Number.isFinite(values?.treble) ? values.treble : 0,
      amplitude: Number.isFinite(values?.amplitude) ? values.amplitude : 0,
    };

    this.analysisBassNode.textContent = `${safeValues.bass}`;
    this.analysisMidNode.textContent = `${safeValues.mid}`;
    this.analysisTrebleNode.textContent = `${safeValues.treble}`;
    this.analysisAmplitudeNode.textContent = `${safeValues.amplitude}`;
    this.analysisOutputNode.textContent = JSON.stringify(safeValues, null, 2);
  }

  setControls({
    canLoadLocal = true,
    canLoadUrl = true,
    canLoadDemo = true,
    canEditTrackUrl = true,
    canPlay = false,
    canPause = false,
    canStop = false,
  }) {
    this.fileInput.disabled = !canLoadLocal;
    this.trackUrlInput.disabled = !canEditTrackUrl;
    this.loadUrlButton.disabled = !canLoadUrl;
    this.loadDemoButton.disabled = !canLoadDemo;
    this.playButton.disabled = !canPlay;
    this.pauseButton.disabled = !canPause;
    this.stopButton.disabled = !canStop;
  }
}
