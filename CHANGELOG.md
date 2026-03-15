# CHANGELOG

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed (Core vs App Governance Sync)

- Synced governance docs to lock repository operating model as **Core / Engine / Integration Demo**.
- Added explicit Core-vs-App track split rules to prevent silent mixing in one implementation stream.
- Added required target declaration before broad UX/UI or visual passes (Core demo improvement vs App/product development).
- Clarified that demo surface evolution is allowed when it stays honest as integration validation, not consumer flagship scope.
- Added mandatory docs-sync rule for project positioning changes across governance/process files and roadmap.

### Changed (Core Positioning & Docs Sync)

- Repositioned VizuPlayer as **Core / Engine / Integration Demo** in project documentation.
- Synced README, roadmap, architecture, and project-state docs to clarify what VizuPlayer is, what it is not, and who it serves.
- Clarified boundary between engine/demo responsibilities in this repository and standalone consumer app-surface responsibilities in an adjacent layer.
- Refreshed active roadmap priorities around core stability, integration readiness, API consumption clarity, and demo-surface hygiene.


### Changed (Core Demo Surface Cohesion Pass)

- Reframed `index.html` into a more coherent core-first integration surface:
  - removed standalone/flagship consumer framing from hero and launch copy
  - clarified validation flow (`quick demo`, `local file`, `URL/asset source`)
  - aligned controls and support panels to runtime/integration responsibilities
- Improved UI cohesion and readability without changing runtime contracts:
  - stronger visual hierarchy between source flow, reactive stage, and runtime control column
  - refined card/shell styling, spacing, and responsive behavior for desktop/mobile
  - added light staged reveal motion for better perceived flow while preserving accessibility (`focus-visible`, reduced interaction friction)
- Kept scope intentionally non-invasive:
  - no `src/audio/*` changes
  - no lifecycle/orchestration behavior changes
  - no `window.vizuPlayer` facade contract changes

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

### Fixed (Debug Source Reporting Tiny Pass)

- Debug source reporting in `src/audio/audioEngine.js` now returns empty source after `unload()` when both element `src` and attribute `src` are empty, even if browser `currentSrc` is stale.

### Added (Debug Source Reporting Tiny Pass)

- Added targeted regression check `scripts/regression/unload-source-reporting-regression.mjs` for post-unload stale-`currentSrc` browser behavior.

### Validated (Debug Source Reporting Tiny Pass)

- `node --check src/audio/audioEngine.js`
- `node --check scripts/regression/unload-source-reporting-regression.mjs`
- `node scripts/regression/unload-source-reporting-regression.mjs` -> `PASS post-unload source-reporting`
- `node scripts/regression/command-phase-regression.mjs` -> `SUMMARY 13/13 passing`

### Changed (Beauty Slice: Scene Hierarchy Rebalance)

- Applied a narrow canvas-only composition pass in `src/visual/visualizer.js`:
  - reduced always-on background noise (stars/grid/nebula motion/presence)
  - reduced global amplitude pumping across non-hero layers
  - rebalanced render order so spectrum bars read as the hero layer
  - tightened idle/ready/paused quiet behavior without changing phase semantics
- Applied supporting-layer restraint tuning in `src/visual/nodeNetwork.js`:
  - lowered baseline visibility, glow, flicker, and motion intensity
  - reduced treble accent aggressiveness and idle animation energy
  - preserved existing topology/layout contract and constructor API

### Validated (Beauty Slice: Scene Hierarchy Rebalance)

- `node --check src/visual/visualizer.js`
- `node --check src/visual/nodeNetwork.js`
- `node scripts/regression/command-phase-regression.mjs` -> `SUMMARY 13/13 passing`

### Changed (Beauty Slice: UI Coherence Lite / Product Shell Reframe)

- Reframed `index.html` from MVP/debug panel composition into a product-shell layout without changing runtime logic.
- Promoted the visualizer area to the primary hero region with larger visual footprint and stronger framing.
- Grouped source + playback controls into a compact side deck to reduce competition with the visual scene.
- Demoted diagnostics into a secondary collapsible block (`<details>`) to reduce always-on debug dominance.
- Updated typography/spacing/surface hierarchy for a cleaner product-facing presentation while preserving all existing DOM ids used by JS.

### Validated (Beauty Slice: UI Coherence Lite / Product Shell Reframe)

- `node scripts/regression/command-phase-regression.mjs` -> `SUMMARY 13/13 passing`
- No JS files changed in this pass; `node --check` was not required.

### Changed (Reactive Semantics Tuning / Luminous Cosmic Core)

- Applied a narrow role-remap pass in `src/visual/visualizer.js`:
  - reduced amplitude-led global pumping in ambient/supporting layers (`drawNebula`, `drawGrid`, `drawPanelFrame`, star/spectrum contributions)
  - introduced local derived render levels (`massLevel`, `structureLevel`, `sparkleLevel`, `ambientLevel`, `envelope`) to keep amplitude a secondary envelope
  - rebuilt center hierarchy in `drawCenterPulse`: bass-led mass/radius, mid-led halo/energy body, treble-led white-hot core and sparse edge articulation
  - reduced spectrum bars participation in overall scene glow so bars no longer compete with the central luminous object
- Applied matching narrow semantic tuning in `src/visual/nodeNetwork.js`:
  - lowered amplitude influence on network visibility/glow in `updateEnergy` and draw paths
  - shifted structural presence and connective tension toward mid-led behavior (`updateNodes`, `drawConnections`)
  - increased bass contribution to node body weight/mass perception (`updateNodes`, `drawNodes`)
  - kept treble accents rarer/sharper so they read as articulation, not global brightness multipliers

### Validated (Reactive Semantics Tuning / Luminous Cosmic Core)

- `node --check src/visual/visualizer.js`
- `node --check src/visual/nodeNetwork.js`
- `node scripts/regression/command-phase-regression.mjs` -> `SUMMARY 13/13 passing`
- `node scripts/regression/unload-source-reporting-regression.mjs` -> `PASS post-unload source-reporting`

### Changed (Cosmic Beauty Reframe Pass)

- Rebuilt `src/visual/visualizer.js` as a broad, layered cosmic composition pass:
  - replaced panel-like grid semantics with deep-space depth layering (void backdrop, drifting haze, multi-depth dust, mid-field energy currents, selective foreground shards)
  - rebuilt the center hero into a larger layered cosmic core (aura body, rotating shells, filament turbulence, controlled singularity highlight) to remove the prior white-blob read
  - integrated spectrum bars into an orbital `spectrum corona` around the core instead of a detached bottom/side widget read
  - shifted glow handling to hierarchical contrast discipline (localized white-hot accents, restrained global wash)
- Rebuilt `src/visual/nodeNetwork.js` from a sparse fixed diagram into an adaptive plasma structure:
  - expanded node field density and topology complexity using adaptive nearest/echo connection generation
  - replaced straight graph lines with flowing curved filaments and traveling pulse accents
  - upgraded motion language from mostly static jitter to continuous flow/orbital drift aligned to scene energy
- Reframed `index.html` visual shell styling to support the new hero composition:
  - stronger hero-stage framing and atmospheric shell gradients
  - reduced side-panel visual competition while preserving all JS-bound ids/runtime wiring

### Validated (Cosmic Beauty Reframe Pass)

- `node --check src/visual/visualizer.js`
- `node --check src/visual/nodeNetwork.js`
- `node scripts/regression/command-phase-regression.mjs` -> `SUMMARY 13/13 passing`
- `node scripts/regression/unload-source-reporting-regression.mjs` -> `PASS post-unload source-reporting`

### Changed (Less HUD, More Cosmic Phenomenon Pass)

- Reworked `src/visual/visualizer.js` to intentionally reduce HUD/diagram read:
  - cut down fine linear overlays and thin orbital clutter
  - shifted visual focus toward a larger layered plasma star-core with less literal sphere feel
  - softened bars into a lower-density integrated corona around the core rather than a separate loud module
- Simplified and rebalanced `src/visual/nodeNetwork.js`:
  - reduced default topology density (fewer nodes/links) and lowered graph-like dominance
  - reshaped connective motion into core-supporting plasma flow curves
  - kept treble accents selective instead of constant micro-flicker
- Tuned `index.html` shell styling for lower HUD flavor:
  - softened frame/label treatment and reduced technical chip-like framing emphasis
  - added restrained deep-blue/violet atmospheric hierarchy while preserving existing runtime ids

### Changed (Render Complexity Reduction in This Pass)

- Lowered particle counts and reduced high-frequency decorative layers in the canvas path.
- Reduced spectrum-corona draw density (`coronaStride`) so fewer per-frame radial segments are rendered.
- Reduced network geometry complexity via fewer default nodes/edges and simpler per-edge styling passes.
- Removed multiple thin-line decorative operations that had low beauty ROI versus frame cost.

### Validated (Less HUD, More Cosmic Phenomenon Pass)

- `node --check src/visual/visualizer.js`
- `node --check src/visual/nodeNetwork.js`
- `node scripts/regression/command-phase-regression.mjs` -> `SUMMARY 13/13 passing`
- `node scripts/regression/unload-source-reporting-regression.mjs` -> `PASS post-unload source-reporting`

### Changed (Flagship Product Surface Reframe)

- Reworked `index.html` from a demo-bench style control layout into a standalone product-facing surface.
- Replaced generic positioning copy with experience-led hero messaging centered on listening sessions.
- Made first-screen launch flow explicit with three visible scenarios and one primary CTA:
  - try demo (primary)
  - upload your track
  - paste audio URL
- Reframed controls language from technical source/playback framing to `Now Playing` and session semantics.
- Demoted diagnostics to a clearly secondary advanced `<details>` block while preserving all runtime-required DOM ids.
- Kept scope constrained to UI shell/copy/layout; no changes to `src/audio/*`, lifecycle orchestration, or integration facade contracts.

### Validated (Flagship Product Surface Reframe)

- `node scripts/regression/command-phase-regression.mjs` -> `SUMMARY 13/13 passing`
- `node scripts/regression/unload-source-reporting-regression.mjs` -> `PASS post-unload source-reporting``r`n