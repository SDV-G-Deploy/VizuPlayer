export const PLAYER_PHASES = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  PLAYING: "playing",
  PAUSED: "paused",
  ENDED: "ended",
  ERROR: "error",
});

export class MusicPlayer {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.resetTrackState();
  }

  setPhase(phase) {
    this.phase = Object.values(PLAYER_PHASES).includes(phase) ? phase : PLAYER_PHASES.ERROR;
  }

  beginLoad() {
    this.audioEngine.stop();
    this.hasTrackLoaded = false;
    this.trackType = "none";
    this.trackLabel = "";
    this.errorMessage = "";
    this.setPhase(PLAYER_PHASES.LOADING);
  }

  commitTrackLoad({ trackType, trackLabel }) {
    this.hasTrackLoaded = true;
    this.trackType = trackType || "unknown";
    this.trackLabel = trackLabel || "";
    this.errorMessage = "";
    this.setPhase(PLAYER_PHASES.READY);
  }

  setError(message, { keepTrackLoaded = false } = {}) {
    if (!keepTrackLoaded) {
      this.hasTrackLoaded = false;
      this.trackType = "none";
      this.trackLabel = "";
    }

    this.errorMessage = typeof message === "string" ? message : "Action failed.";
    this.setPhase(PLAYER_PHASES.ERROR);
  }

  async loadLocalFile(file, graphOptions = {}) {
    await this.audioEngine.loadFile(file, graphOptions);
  }

  async loadDemoTrack(url, graphOptions = {}, loadOptions = {}) {
    await this.audioEngine.loadUrl(url, graphOptions, loadOptions);
  }

  async play() {
    if (!this.hasTrackLoaded) {
      throw new Error("Load a local file or demo track first.");
    }

    if (this.phase === PLAYER_PHASES.LOADING) {
      throw new Error("Track is currently loading.");
    }

    if (this.phase === PLAYER_PHASES.ENDED) {
      this.audioEngine.stop();
    }

    await this.audioEngine.play();
    this.setPhase(PLAYER_PHASES.PLAYING);
    this.errorMessage = "";
  }

  pause() {
    if (!this.hasTrackLoaded || this.phase !== PLAYER_PHASES.PLAYING) {
      return false;
    }

    this.audioEngine.pause();
    this.setPhase(PLAYER_PHASES.PAUSED);
    return true;
  }

  stop() {
    if (!this.hasTrackLoaded) {
      return false;
    }

    this.audioEngine.stop();
    this.setPhase(PLAYER_PHASES.READY);
    return true;
  }

  markEnded() {
    if (!this.hasTrackLoaded) {
      return;
    }

    this.setPhase(PLAYER_PHASES.ENDED);
  }

  resetToIdle() {
    this.audioEngine.unload();
    this.resetTrackState();
  }

  resetTrackState() {
    this.hasTrackLoaded = false;
    this.trackType = "none";
    this.trackLabel = "";
    this.errorMessage = "";
    this.phase = PLAYER_PHASES.IDLE;
  }

  getState() {
    return {
      phase: this.phase,
      hasTrackLoaded: this.hasTrackLoaded,
      isPlaying: this.phase === PLAYER_PHASES.PLAYING,
      trackType: this.trackType,
      trackLabel: this.trackLabel,
      errorMessage: this.errorMessage,
    };
  }
}
