# PROJECT_STATE

## Current Focus

Lifecycle/load hardening baseline is accepted after targeted abort/cancel fix-pass, manual browser smoke, and post-fix re-audit.

## Current Stage

- Stage: 3 - Lifecycle/load stable baseline accepted
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
- Manual browser smoke and post-fix re-audit passed; lifecycle/load baseline is accepted for the next phase.
- Lightweight regression harness now provides deterministic baseline checks for command/phase transitions and race-sensitive lifecycle boundaries.

## Known Limitations

- True transport-level cancellation of network fetches is not implemented; stale-load result suppression is used.
- Non-blocking console noise remains for missing favicon in browser runtime.

## Next Targets

- Keep the lightweight regression harness green as a required baseline gate for lifecycle/load changes.
- Expand targeted coverage only when new lifecycle edges are introduced.
- Continue future feature work on top of this hardened lifecycle baseline.

## 2026-03-14 Update (Stop/Loading Race Closure)

- Added deterministic in-flight load cancellation path by propagating `AbortSignal` from `src/core/app.js` through `src/audio/musicPlayer.js` to `src/audio/audioEngine.js`.
- `STOP` during `loading` now aborts active load wait immediately, preventing load worker lock while old request is unresolved.
- Superseding latest-load requests now abort the currently active in-flight request so the next queued load can begin immediately.
- Stale completion/error suppression remains in place (`requestId` / latest-request checks).
- Added a phase guard in the `ended` listener so explicit stop state is not overwritten by late `ended` callbacks.
- Syntax validation completed for touched JS files with `node --check`; manual browser smoke and post-fix re-audit are now completed and passed.

## 2026-03-14 Update (Regression Check Layer Pass)

- Added `scripts/regression/command-phase-regression.mjs` as a minimal, deterministic, no-framework check layer.
- Added a test-safe bootstrap seam in `src/core/app.js` (`bootstrap(options)`) plus guarded auto-bootstrap (`globalThis.__VIZUPLAYER_DISABLE_AUTO_BOOTSTRAP__`) for headless checks.
- Automated coverage now includes:
  - initial bootstrap expectations
  - load -> ready
  - play from ready
  - pause from playing
  - stop from playing
  - stop during loading
  - rapid load A -> load B latest-wins behavior
  - stale completion suppression against newer request state
  - ended callback guard against explicit stop overwrite
  - UI/public API orchestration entrypoint parity assumptions
- Validation completed:
  - `node --check src/core/app.js`
  - `node --check src/audio/musicPlayer.js`
  - `node --check src/audio/audioEngine.js`
  - `node --check scripts/regression/command-phase-regression.mjs`
  - `node scripts/regression/command-phase-regression.mjs` -> `SUMMARY 10/10 passing`

## 2026-03-14 Update (Debug Source-Reporting Tiny Fix Pass)

- Implemented a narrow debug consistency patch in `src/audio/audioEngine.js` to avoid stale source reporting after `unload()`.
- `getCurrentSource()` now treats empty `src` + empty `getAttribute("src")` as canonical unloaded state and returns `""` instead of stale `currentSrc`.
- Added focused regression coverage at `scripts/regression/unload-source-reporting-regression.mjs` for the post-unload stale-URL edge only.
- Stable contract scope preserved: no changes to `window.vizuPlayer`, stable facade surface, phase model, orchestration shape, or UI features.
- Validation completed:
  - `node --check src/audio/audioEngine.js`
  - `node --check scripts/regression/unload-source-reporting-regression.mjs`
  - `node scripts/regression/unload-source-reporting-regression.mjs`
  - `node scripts/regression/command-phase-regression.mjs` (`SUMMARY 13/13 passing`)

## 2026-03-15 Update (Cosmic Beauty Reframe Pass)

- Completed a broad visual-only reframe in `src/visual/visualizer.js`, `src/visual/nodeNetwork.js`, and `index.html` styling without touching audio/lifecycle/integration API systems.
- Replaced the prior panel/diagram read with a layered cosmic composition:
  - larger multi-layer core with richer form language
  - denser plasma-like network behavior with curved connective flow
  - integrated orbital spectrum semantics instead of detached bar-widget feel
  - stronger depth and glow hierarchy (dark field, haze, mid-energy, dominant core, selective foreground accents)
- Lifecycle/load baseline remains intact; regression checks continue to pass.
- Validation completed:
  - `node --check src/visual/visualizer.js`
  - `node --check src/visual/nodeNetwork.js`
  - `node scripts/regression/command-phase-regression.mjs` (`SUMMARY 13/13 passing`)
  - `node scripts/regression/unload-source-reporting-regression.mjs` (`PASS post-unload source-reporting`)
- Pending: manual visual review across bass-heavy, mid-rich, treble-bright, and pause/resume scenarios for final taste-level acceptance.

## 2026-03-15 Update (Less HUD, More Cosmic Phenomenon Pass)

- Completed a second broad visual-only pass focused on reducing HUD/diagram aesthetics and strengthening the scene as a single cosmic phenomenon.
- Visual changes stayed scoped to `src/visual/visualizer.js`, `src/visual/nodeNetwork.js`, and `index.html` styling; audio/lifecycle/analyser/API systems were untouched.
- Core outcomes:
  - fewer thin orbit/graph-like lines and less schematic overlay feel
  - stronger layered star-core/plasma-bloom center with reduced gray-sphere read
  - simpler supporting network with fewer nodes/links and more core-coupled flow behavior
  - improved palette hierarchy with deep blue base, cyan/teal body, selective white-hot highlights, and subtle violet depth accents
- Render complexity reductions in this pass:
  - reduced particle counts and decorative micro-geometry
  - reduced spectrum corona segment density
  - reduced network default topology and per-frame line styling work
- Validation completed:
  - `node --check src/visual/visualizer.js`
  - `node --check src/visual/nodeNetwork.js`
  - `node scripts/regression/command-phase-regression.mjs` (`SUMMARY 13/13 passing`)
  - `node scripts/regression/unload-source-reporting-regression.mjs` (`PASS post-unload source-reporting`)
- Pending: manual track-by-track visual acceptance for final taste-level sign-off.
