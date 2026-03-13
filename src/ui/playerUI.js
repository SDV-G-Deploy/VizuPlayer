export class PlayerUI {
  constructor({ mountNode, onLoad, onPlay, onPause, onStop }) {
    this.mountNode = mountNode;
    this.onLoad = onLoad;
    this.onPlay = onPlay;
    this.onPause = onPause;
    this.onStop = onStop;
    this.trackInput = null;
    this.statusNode = null;
  }

  render() {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <label style="display:block;margin-bottom:8px;">Track URL</label>
      <input id="track-url" type="text" placeholder="./assets/music/sample.mp3" style="width:100%;margin-bottom:10px;padding:8px;" />
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button data-action="load">Load</button>
        <button data-action="play">Play</button>
        <button data-action="pause">Pause</button>
        <button data-action="stop">Stop</button>
      </div>
      <p id="player-status" style="margin-top:10px;opacity:0.8;">Idle</p>
    `;

    this.mountNode.appendChild(wrapper);
    this.trackInput = wrapper.querySelector("#track-url");
    this.statusNode = wrapper.querySelector("#player-status");

    wrapper.querySelector('[data-action="load"]').addEventListener("click", async () => {
      try {
        await this.onLoad(this.trackInput.value.trim());
        this.setStatus("Track loaded");
      } catch (error) {
        this.setStatus(error.message);
      }
    });

    wrapper.querySelector('[data-action="play"]').addEventListener("click", async () => {
      try {
        await this.onPlay();
        this.setStatus("Playing");
      } catch (error) {
        this.setStatus(error.message);
      }
    });

    wrapper.querySelector('[data-action="pause"]').addEventListener("click", async () => {
      await this.onPause();
      this.setStatus("Paused");
    });

    wrapper.querySelector('[data-action="stop"]').addEventListener("click", async () => {
      await this.onStop();
      this.setStatus("Stopped");
    });
  }

  setStatus(message) {
    if (this.statusNode) {
      this.statusNode.textContent = message;
    }
  }
}
