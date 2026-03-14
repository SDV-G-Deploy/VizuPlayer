# PROJECT_STATE

## Current Focus

Lifecycle and load-state hardening pass for the existing player + visualizer foundation.

## Current Stage

- Stage: 3 - Node network foundation + lifecycle hardening
- Date: 2026-03-14

## Implemented In This Pass

- Introduced explicit runtime phase modeling across playback/app flow:
  - `idle`
  - `loading`
  - `ready`
  - `playing`
  - `paused`
  - `ended`
  - `error`
- Reworked command orchestration in `src/core/app.js` to use one centralized command path for UI events and `window.vizuPlayer` public methods.
- Added serialized, latest-wins load coordination:
  - only one active load worker
  - only the latest queued request is kept
  - stale completions/errors from superseded loads are ignored
- Added deterministic timeout for URL/demo loads via `APP_CONFIG.playback.urlLoadTimeoutMs` and `AudioEngine.waitForAudioCanPlay(..., { timeoutMs })`.
- Added explicit loading control gating (file/url input + load/play/pause/stop disabling) based on phase.
- Normalized analysis/visual semantics for non-playing phases:
  - `paused`: analysis decays toward idle baseline
  - `ended`: analysis resets to zero
  - `stop`: clean reset to zero with coherent status/controls
- Added same-file local reselect support by clearing file input value after change handling.
- Gated periodic analysis console logging behind `APP_CONFIG.analyser.enableLogging`.

## Working Now

- Local file load, bundled demo/url load, play, pause, and stop remain functional through one orchestrated command path.
- Rapid repeated load clicks no longer allow stale load completion to overwrite final app state.
- URL/demo load no longer hangs forever without terminal completion.
- Control status and enabled/disabled behavior are phase-derived instead of spread across ad-hoc booleans.
- Metrics and visualizer input return to idle semantics consistently for pause/ended/stop transitions.

## Known Limitations

- True transport-level cancellation of network fetches is not implemented; stale-load result suppression is used.
- Full behavioral validation still requires browser runtime smoke checks.

## Next Targets

- Run focused browser smoke tests for rapid-load races and timeout/error paths.
- Add small targeted tests for phase transitions and load queue behavior when a browser harness is available.
- Keep future feature work on top of this hardened lifecycle baseline.
