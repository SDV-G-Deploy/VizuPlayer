# CHANGELOG

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Explicit `Demo / URL Track` loading controls alongside local file picker flow
- `Stop` playback control for baseline transport completeness
- On-page numeric analysis surface for `bass`, `mid`, `treble`, `amplitude`

### Updated

- Aligned runtime architecture with intended module boundaries:
  - `audioEngine.js` for graph/source lifecycle
  - `musicPlayer.js` for playback/load state coordination
  - `playerUI.js` for DOM bindings and display
  - `app.js` for orchestration and frame-loop lifecycle
- Hardened playback/load flow for:
  - play before load
  - pause/resume
  - stop/reset
  - loading a second track
- Improved resource safety:
  - stale object URL revocation on local track replacement
  - single media source graph creation
  - single active `requestAnimationFrame` analysis loop
- Kept console logs structured but throttled to avoid noise
