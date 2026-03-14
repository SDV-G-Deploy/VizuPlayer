export class MusicPlayer {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.resetTrackState();
  }

  async loadLocalFile(file, graphOptions = {}) {
    try {
      await this.audioEngine.loadFile(file, graphOptions);
      this.hasTrackLoaded = true;
      this.isPlaying = false;
      this.trackType = "local";
      this.trackLabel = file.name;
    } catch (error) {
      this.resetTrackState();
      throw error;
    }
  }

  async loadDemoTrack(url, graphOptions = {}) {
    try {
      await this.audioEngine.loadUrl(url, graphOptions);
      this.hasTrackLoaded = true;
      this.isPlaying = false;
      this.trackType = "demo-url";
      this.trackLabel = url;
    } catch (error) {
      this.resetTrackState();
      throw error;
    }
  }

  async play() {
    if (!this.hasTrackLoaded) {
      throw new Error("Load a local file or demo track first.");
    }

    await this.audioEngine.play();
    this.isPlaying = true;
  }

  pause() {
    if (!this.hasTrackLoaded) {
      return;
    }

    this.audioEngine.pause();
    this.isPlaying = false;
  }

  stop() {
    if (!this.hasTrackLoaded) {
      return;
    }

    this.audioEngine.stop();
    this.isPlaying = false;
  }

  markEnded() {
    this.isPlaying = false;
  }

  resetTrackState() {
    this.hasTrackLoaded = false;
    this.isPlaying = false;
    this.trackType = "none";
    this.trackLabel = "";
  }

  getState() {
    return {
      hasTrackLoaded: this.hasTrackLoaded,
      isPlaying: this.isPlaying,
      trackType: this.trackType,
      trackLabel: this.trackLabel,
    };
  }
}
