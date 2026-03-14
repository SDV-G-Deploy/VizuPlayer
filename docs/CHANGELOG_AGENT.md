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
