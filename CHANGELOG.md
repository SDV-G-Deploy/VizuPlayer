# CHANGELOG

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Explicit player/app phase model in `src/audio/musicPlayer.js`:
  - `idle`
  - `loading`
  - `ready`
  - `playing`
  - `paused`
  - `ended`
  - `error`
- URL/demo load timeout config in `src/core/config.js`:
  - `playback.urlLoadTimeoutMs`
- Analysis logging toggle in `src/core/config.js`:
  - `analyser.enableLogging`

### Changed

- `src/core/app.js` now centralizes command orchestration for both UI events and `window.vizuPlayer` public API methods.
- `src/core/app.js` now serializes load handling with latest-wins behavior and stale completion suppression.
- `src/audio/audioEngine.js` now supports deterministic timeout completion for source loading and includes `unload()` for clean source reset.
- `src/ui/playerUI.js` now gates file/url/transport controls from phase-derived state and clears file input after selection to allow same-file reselection.
- Pause/ended/stop semantics now reset or decay analysis-driven visual input consistently to avoid stale energized visuals when not playing.

### Fixed

- Concurrent rapid load requests no longer commit stale results into final runtime state.
- URL/demo load path no longer hangs indefinitely on unresolved sources.
- Public API playback/load commands now follow the same orchestrated state path as UI controls.

### Added

- Audio asset `assets/music/dwarwo2.mp3`.
