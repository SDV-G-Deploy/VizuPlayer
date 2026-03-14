export const APP_CONFIG = Object.freeze({
  appName: "VizuPlayer",
  version: "0.5.0",
  playback: {
    bundledDemoTrackUrl: "./assets/music/little-more-intense-cosmo-puzzle-1.mp3",
  },
  ui: {
    fileInputId: "audio-file-input",
    trackUrlInputId: "track-url-input",
    loadUrlButtonId: "load-url-button",
    loadDemoButtonId: "load-demo-button",
    playButtonId: "play-button",
    pauseButtonId: "pause-button",
    stopButtonId: "stop-button",
    statusId: "player-status",
    analysisBassId: "analysis-bass",
    analysisMidId: "analysis-mid",
    analysisTrebleId: "analysis-treble",
    analysisAmplitudeId: "analysis-amplitude",
    analysisOutputId: "analysis-output",
    visualizerCanvasId: "visualizer-canvas",
  },
  analyser: {
    fftSize: 2048,
    smoothingTimeConstant: 0.82,
    logIntervalMs: 400,
    bands: {
      bass: [20, 250],
      mid: [250, 2000],
      treble: [2000, 8000],
    },
  },
  visualizer: {
    barCount: 64,
    network: {
      nodeRadius: 5.4,
    },
  },
});
