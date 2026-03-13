export class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.audioElement = null;
    this.mediaElementSource = null;
    this.analyserNode = null;
    this.currentObjectUrl = "";
  }

  async ensureContext() {
    if (this.audioContext) {
      return this.audioContext;
    }

    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) {
      throw new Error("Web Audio API is not supported in this browser.");
    }

    this.audioContext = new Context();
    return this.audioContext;
  }

  async initializeGraph(options = {}) {
    const context = await this.ensureContext();

    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.preload = "auto";
    }

    if (!this.mediaElementSource) {
      this.mediaElementSource = context.createMediaElementSource(this.audioElement);
    }

    if (!this.analyserNode) {
      this.analyserNode = context.createAnalyser();
      this.mediaElementSource.connect(this.analyserNode);
      this.analyserNode.connect(context.destination);
    }

    if (options.fftSize) {
      this.analyserNode.fftSize = options.fftSize;
    }

    if (typeof options.smoothingTimeConstant === "number") {
      this.analyserNode.smoothingTimeConstant = options.smoothingTimeConstant;
    }

    return {
      audioContext: context,
      audioElement: this.audioElement,
      analyserNode: this.analyserNode,
    };
  }

  async loadFile(file, graphOptions = {}) {
    if (!(file instanceof File)) {
      throw new Error("Please choose a valid audio file.");
    }

    await this.initializeGraph(graphOptions);

    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = "";
    }

    this.currentObjectUrl = URL.createObjectURL(file);
    this.audioElement.src = this.currentObjectUrl;
    this.audioElement.load();

    await this.waitForAudioCanPlay();
  }

  waitForAudioCanPlay() {
    if (!this.audioElement) {
      return Promise.reject(new Error("Audio element is not initialized."));
    }

    if (this.audioElement.readyState >= 2) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const onCanPlay = () => {
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(new Error("Unable to load selected audio file."));
      };

      const cleanup = () => {
        this.audioElement.removeEventListener("canplay", onCanPlay);
        this.audioElement.removeEventListener("error", onError);
      };

      this.audioElement.addEventListener("canplay", onCanPlay);
      this.audioElement.addEventListener("error", onError);
    });
  }

  async play() {
    if (!this.audioElement || !this.audioElement.src) {
      throw new Error("No audio file loaded.");
    }

    const context = await this.ensureContext();
    if (context.state === "suspended") {
      await context.resume();
    }

    await this.audioElement.play();
  }

  pause() {
    if (!this.audioElement) {
      return;
    }

    this.audioElement.pause();
  }

  getAudioContext() {
    return this.audioContext;
  }

  getAudioElement() {
    return this.audioElement;
  }

  getAnalyserNode() {
    return this.analyserNode;
  }
}
