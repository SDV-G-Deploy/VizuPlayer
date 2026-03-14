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
      this.audioElement.crossOrigin = "anonymous";
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

  async loadFile(file, graphOptions = {}, loadOptions = {}) {
    if (!(file instanceof File)) {
      throw new Error("Please choose a valid audio file.");
    }

    await this.initializeGraph(graphOptions);
    this.stop();
    this.clearObjectUrl();

    const objectUrl = URL.createObjectURL(file);
    this.currentObjectUrl = objectUrl;

    try {
      await this.loadSource(objectUrl, "Unable to load selected audio file.", loadOptions);
    } catch (error) {
      this.unload();
      throw error;
    }
  }

  async loadUrl(url, graphOptions = {}, loadOptions = {}) {
    const trimmedUrl = typeof url === "string" ? url.trim() : "";
    if (!trimmedUrl) {
      throw new Error("Track URL is empty.");
    }

    await this.initializeGraph(graphOptions);
    this.stop();
    this.clearObjectUrl();

    try {
      await this.loadSource(trimmedUrl, "Unable to load demo/url track.", loadOptions);
    } catch (error) {
      this.unload();
      throw error;
    }
  }

  async loadSource(sourceUrl, errorMessage, loadOptions = {}) {
    if (!this.audioElement) {
      throw new Error("Audio element is not initialized.");
    }

    this.audioElement.src = sourceUrl;
    this.audioElement.load();
    await this.waitForAudioCanPlay(errorMessage, loadOptions);
  }

  waitForAudioCanPlay(errorMessage = "Unable to load audio source.", { timeoutMs = 0, signal = null } = {}) {
    if (!this.audioElement) {
      return Promise.reject(new Error("Audio element is not initialized."));
    }

    if (signal?.aborted) {
      return Promise.reject(new Error("Audio load aborted."));
    }

    if (this.audioElement.readyState >= 2) {
      return Promise.resolve();
    }

    const normalizedTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0
      ? Math.floor(timeoutMs)
      : 0;

    return new Promise((resolve, reject) => {
      let timeoutId = null;

      const cleanup = () => {
        this.audioElement.removeEventListener("canplay", onCanPlay);
        this.audioElement.removeEventListener("error", onError);

        if (signal && typeof signal.removeEventListener === "function") {
          signal.removeEventListener("abort", onAbort);
        }

        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
      };

      const onCanPlay = () => {
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(new Error(errorMessage));
      };

      const onTimeout = () => {
        cleanup();
        reject(new Error(`${errorMessage} (timed out after ${normalizedTimeoutMs} ms).`));
      };

      const onAbort = () => {
        cleanup();
        reject(new Error("Audio load aborted."));
      };

      this.audioElement.addEventListener("canplay", onCanPlay);
      this.audioElement.addEventListener("error", onError);

      if (signal && typeof signal.addEventListener === "function") {
        signal.addEventListener("abort", onAbort, { once: true });

        if (signal.aborted) {
          onAbort();
          return;
        }
      }

      if (normalizedTimeoutMs > 0) {
        timeoutId = window.setTimeout(onTimeout, normalizedTimeoutMs);
      }
    });
  }

  async play() {
    if (!this.audioElement || !this.audioElement.src) {
      throw new Error("Load a local file or demo track first.");
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

  stop() {
    if (!this.audioElement) {
      return;
    }

    this.audioElement.pause();

    try {
      this.audioElement.currentTime = 0;
    } catch (error) {
      // Some stream sources may not allow immediate seek/reset.
    }
  }

  unload() {
    if (!this.audioElement) {
      this.clearObjectUrl();
      return;
    }

    this.audioElement.pause();
    this.audioElement.removeAttribute("src");
    this.audioElement.load();
    this.clearObjectUrl();
  }

  clearObjectUrl() {
    if (!this.currentObjectUrl) {
      return;
    }

    URL.revokeObjectURL(this.currentObjectUrl);
    this.currentObjectUrl = "";
  }

  getCurrentSource() {
    if (!this.audioElement) {
      return "";
    }

    return this.audioElement.currentSrc || this.audioElement.src || "";
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
