export class MusicPlayer {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.currentSource = null;
    this.outputNode = null;
    this.currentTrackUrl = "";
    this.isPlaying = false;
  }

  connect(node) {
    this.outputNode = node;
  }

  async load(url) {
    if (!url) {
      throw new Error("Track URL is empty.");
    }

    await this.stop();
    this.currentTrackUrl = url;
    this.currentSource = await this.audioEngine.createSourceFromUrl(url);

    if (this.outputNode) {
      this.currentSource.connect(this.outputNode);
    }

    this.currentSource.onended = () => {
      this.isPlaying = false;
    };
  }

  async play() {
    const context = await this.audioEngine.ensureContext();
    if (context.state === "suspended") {
      await context.resume();
    }

    if (!this.currentSource && this.currentTrackUrl) {
      await this.load(this.currentTrackUrl);
    }

    if (!this.currentSource) {
      throw new Error("No track loaded.");
    }

    this.currentSource.start(0);
    this.isPlaying = true;
  }

  async pause() {
    // BufferSource nodes cannot pause/resume directly, so stop is used for now.
    await this.stop();
  }

  async stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop(0);
      } catch (error) {
        // Ignore invalid-state errors when node is already stopped.
      }

      this.currentSource.disconnect();
      this.currentSource = null;
    }

    this.isPlaying = false;
  }
}
