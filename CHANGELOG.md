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

### Fixed (Stop/Loading Race Closure Pass)

- STOP during loading now aborts the active in-flight load wait and releases the load worker immediately.
- Superseding load requests now abort the active in-flight load, so the next request can start without waiting for old timeout completion.
- Stale async completion suppression remains enforced after abort-triggered failures.

### Changed (Stop/Loading Race Closure Pass)

- src/core/app.js now tracks an active load AbortController and aborts it on stop invalidation and superseding loads.
- Load orchestration now passes AbortSignal through MusicPlayer into AudioEngine.waitForAudioCanPlay(...).
- Ended handler in src/core/app.js now ignores late ended callbacks unless the runtime phase is still playing.

### Validated (Lifecycle/Load Baseline Acceptance)

- Lifecycle/load hardening baseline is accepted after targeted abort/cancel fix-pass, manual browser smoke, and post-fix re-audit.
- Acceptance includes parity confirmation for UI control path and window.vizuPlayer command path.
- Remaining known runtime noise: missing favicon console warning (non-blocking).

### Added (Regression Check Pass)

- Added lightweight deterministic regression harness: `scripts/regression/command-phase-regression.mjs`.
- Added explicit scenario coverage for command/phase transitions and lifecycle races:
  - initial bootstrap state
  - load -> ready
  - play from ready
  - pause from playing
  - stop from playing
  - stop during loading
  - rapid latest-wins load A -> B
  - stale completion suppression
  - ended callback guard after explicit stop
  - UI/public API orchestration entrypoint parity assumptions

### Changed (Regression Check Pass)

- `src/core/app.js` now exports `bootstrap(options)` with optional dependency injection seams for headless harness execution.
- `src/core/app.js` auto-bootstrap is now guarded by `globalThis.__VIZUPLAYER_DISABLE_AUTO_BOOTSTRAP__` for deterministic non-browser regression runs.
- Browser runtime path remains default (`bootstrap()` still auto-runs when the guard is not set).

### Validated (Regression Check Pass)

- `node --check src/core/app.js`
- `node --check src/audio/musicPlayer.js`
- `node --check src/audio/audioEngine.js`
- `node --check scripts/regression/command-phase-regression.mjs`
- `node scripts/regression/command-phase-regression.mjs` -> `SUMMARY 10/10 passing`


### Added (Thin Facade Pass)

- Added `unload` command orchestration path in `src/core/app.js` and exposed it on `window.vizuPlayer` (`unload()` + `commands.unload()`).
- Added `onStateChange(listener)` public API with unsubscribe return contract and stable snapshot payloads.
- Added canonical `loadTrack(url)` alias over the existing URL/demo load path (`window.vizuPlayer.loadTrack` and `window.vizuPlayer.commands.loadTrack`).

### Changed (Thin Facade Pass)

- Public `getState()` in `src/core/app.js` now returns a stable contract snapshot only:
  - `phase`
  - `hasTrackLoaded`
  - `isPlaying`
  - `trackLabel`
  - `errorMessage`
- State listeners are emitted on runtime phase/state transitions and error transitions without rich event payloads.
- Legacy/deep API surface (`commands.*`, `loadDemoTrack`, `loadBundledDemoTrack`, `loadLocalFile`, `getAnalysis`, internal refs) is now exposed only via unstable debug namespace `window.__VIZUPLAYER_DEBUG__` and is not part of the stable contract.

### Validated (Thin Facade Pass)

- `node --check src/core/app.js`
- `node --check scripts/regression/command-phase-regression.mjs`
- `node scripts/regression/command-phase-regression.mjs` -> `SUMMARY 13/13 passing`

### Changed (Thin Facade Tiny Corrective Pass)

- Public root facade on `window.vizuPlayer` is now restricted to exactly seven canonical methods: `play`, `pause`, `stop`, `loadTrack`, `unload`, `getState`, `onStateChange`.
- Removed deep/legacy fields from public root (`commands`, `loadDemoTrack`, `loadBundledDemoTrack`, `loadLocalFile`, `getAnalysis`, `audioEngine`, `ui`, `visualizer`, `config`).
- Public command methods now use completion/error semantics only and do not expose internal queue/status taxonomy in the external contract.

### Added (Thin Facade Tiny Corrective Pass)

- Added explicit regression checks for exact facade key shape and forbidden-key absence on the public root API.

### Validated (Thin Facade Tiny Corrective Pass)

- `node --check src/core/app.js`
- `node --check scripts/regression/command-phase-regression.mjs`
- `node scripts/regression/command-phase-regression.mjs`
