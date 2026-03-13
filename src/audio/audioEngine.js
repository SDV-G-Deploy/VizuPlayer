export class AudioEngine {
  constructor() {
    this.audioContext = null;
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

  createAnalyser(options = {}) {
    if (!this.audioContext) {
      throw new Error("Audio context is not initialized.");
    }

    const analyser = this.audioContext.createAnalyser();
    if (options.fftSize) {
      analyser.fftSize = options.fftSize;
    }
    if (typeof options.smoothingTimeConstant === "number") {
      analyser.smoothingTimeConstant = options.smoothingTimeConstant;
    }

    return analyser;
  }

  async createSourceFromUrl(url) {
    if (!this.audioContext) {
      throw new Error("Audio context is not initialized.");
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load audio file: ${response.status}`);
    }

    const data = await response.arrayBuffer();
    const buffer = await this.audioContext.decodeAudioData(data);
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    return source;
  }
}
