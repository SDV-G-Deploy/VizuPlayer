# CHANGELOG_AGENT

## 2026-03-14

### Updated

- Corrected MVP loading UX to support two clear paths:
  - `Local File (Primary)` via browser file picker
  - `Demo / URL Track` for hosted/demo validation
- Added `Stop` control to complete baseline playback flow.
- Refactored runtime responsibilities to align with intended structure:
  - `src/audio/audioEngine.js`: context + graph + source lifecycle + object URL revocation
  - `src/audio/musicPlayer.js`: playback/load state coordination
  - `src/ui/playerUI.js`: DOM wiring, control state, and analysis display
  - `src/core/app.js`: orchestration, loop lifecycle, and structured logging
- Added explicit live metric readouts on page for:
  - `bass`
  - `mid`
  - `treble`
  - `amplitude`
- Hardened state transitions and guard rails:
  - play before load
  - pause/resume
  - stop/reset
  - second-track reload without stale resources
  - RAF loop deduplication
  - media source graph reuse safety

### Notes

- This pass intentionally avoided major visual redesign and external dependencies.
- Visualizer expansion remains out of scope until the next stage.

### Updated (Visualizer Foundation Pass)

- Added dedicated canvas visualizer section (`Cosmic Signal Panel`) to active page layout.
- Replaced disconnected visualizer stub with active modular renderer in `src/visual/visualizer.js`.
- Added analyser frame sampling API (`sampleFrame`) to provide both band analysis and spectrum data for visuals.
- Rewired orchestration in `src/core/app.js` to one render loop handling:
  - UI analysis updates
  - canvas rendering
  - throttled analysis logging
- Kept local file picker as primary flow and preserved demo/url loading as optional path.
- Kept playback transport complete with `Play`, `Pause`, and `Stop`.

### Updated (Node Network Overlay MVP Pass)

- Activated `src/visual/nodeNetwork.js` from placeholder to active renderer with:
  - stable intentional layout
  - restrained edge graph
  - idle breathing motion
  - playback-reactive pulse/line/spark behaviors
- Integrated network rendering into `src/visual/visualizer.js` without replacing existing spectrum layer.
- Added visualizer network config in `src/core/config.js` and passed it through `src/core/app.js`.
- Preserved one stable animation loop and existing playback state behavior.

### Updated (Lifecycle Hardening Fix Pass)

- Added explicit phase model to playback/app state (`idle`, `loading`, `ready`, `playing`, `paused`, `ended`, `error`).
- Replaced split command behavior with one orchestration path shared by UI and `window.vizuPlayer` API methods.
- Added serialized latest-wins load coordination in `src/core/app.js`:
  - one active load worker
  - latest pending load request retention
  - stale completion/error suppression by request id
- Added deterministic URL/demo load timeout in `src/audio/audioEngine.js` and wired config (`playback.urlLoadTimeoutMs`).
- Added loading-phase control gating for file/url inputs and transport controls via phase-derived UI state.
- Normalized non-playing analysis semantics:
  - pause decays toward idle
  - ended resets to idle analysis values
  - stop resets metrics/visual input cleanly
- Added same-file reselection support for local file input after each handled change event.
- Gated analysis console logging with config flag (`analyser.enableLogging`) to avoid noisy default runtime output.

### Updated (Asset Add + Push Follow-up)

- Added `assets/music/dwarwo2.mp3` to repository as an additional audio/demo asset by request.
