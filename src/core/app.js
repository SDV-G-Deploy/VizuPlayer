import { AudioEngine } from "../audio/audioEngine.js";
import { AudioAnalyser } from "../audio/analyser.js";
import { MusicPlayer } from "../audio/musicPlayer.js";
import { Visualizer } from "../visual/visualizer.js";
import { PlayerUI } from "../ui/playerUI.js";
import { APP_CONFIG } from "./config.js";

async function bootstrap() {
  const audioEngine = new AudioEngine();
  await audioEngine.ensureContext();

  const analyserNode = audioEngine.createAnalyser(APP_CONFIG.analyser);
  analyserNode.connect(audioEngine.audioContext.destination);

  const analyser = new AudioAnalyser(analyserNode);
  const player = new MusicPlayer(audioEngine);
  player.connect(analyserNode);

  const canvas = document.getElementById(APP_CONFIG.canvasId);
  const mountNode = document.getElementById(APP_CONFIG.playerRootId);

  const visualizer = new Visualizer({ canvas, analyser });
  visualizer.start();

  const ui = new PlayerUI({
    mountNode,
    onLoad: async (url) => player.load(url),
    onPlay: async () => player.play(),
    onPause: async () => player.pause(),
    onStop: async () => player.stop(),
  });

  ui.render();

  // Useful during early integration and manual debugging.
  window.vizuPlayer = {
    audioEngine,
    analyser,
    player,
    visualizer,
    config: APP_CONFIG,
  };
}

bootstrap().catch((error) => {
  console.error("Failed to bootstrap VizuPlayer", error);
});
