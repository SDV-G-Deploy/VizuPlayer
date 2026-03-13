export const APP_CONFIG = Object.freeze({
  appName: "VizuPlayer",
  version: "0.2.0",
  ui: {
    fileInputId: "audio-file-input",
    playButtonId: "play-button",
    pauseButtonId: "pause-button",
    statusId: "player-status",
    analysisOutputId: "analysis-output",
  },
  analyser: {
    fftSize: 2048,
    smoothingTimeConstant: 0.82,
    logIntervalMs: 250,
    bands: {
      bass: [20, 250],
      mid: [250, 2000],
      treble: [2000, 8000],
    },
  },
});
