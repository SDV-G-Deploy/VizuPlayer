# CHANGELOG

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Dedicated `Cosmic Signal Panel` canvas area in active UI (`index.html`)
- Modular canvas renderer in `src/visual/visualizer.js` with idle + music-reactive drawing
- Visualizer wiring in config/UI layers:
  - `ui.visualizerCanvasId`
  - `visualizer.barCount`
- `AudioAnalyser.sampleFrame()` helper for per-frame analysis + spectrum sampling

### Updated

- `src/core/app.js` now drives one stable render loop for both:
  - on-page analysis metric updates
  - visualizer frame rendering
- Preserved and validated local-file primary flow while keeping demo/url loading optional
- Kept `Play`, `Pause`, and `Stop` transport behavior aligned with current player state model
- Kept analysis metrics (`bass/mid/treble/amplitude`) visible and active during playback
