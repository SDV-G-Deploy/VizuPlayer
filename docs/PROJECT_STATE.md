# PROJECT_STATE

## Current Focus

Corrective alignment and hardening of the audio-analysis MVP runtime before the next feature stage.

## Current Stage

- Stage: Audio analysis MVP hardening pass
- Date: 2026-03-14

## Implemented In This Pass

- Kept browser-native audio stack: `HTMLAudioElement` + `AudioContext` + `MediaElementAudioSourceNode` + `AnalyserNode`
- Made local file selection the primary load path via `<input type="file" accept="audio/*">`
- Added explicit `Demo / URL Track` loading path for hosted demo validation
- Added full playback controls: `Play`, `Pause`, `Stop`
- Exposed always-visible live numeric metrics on-page:
  - `bass`
  - `mid`
  - `treble`
  - `amplitude`
- Kept structured analysis output visible in UI (`JSON`) and throttled in console logs
- Hardened runtime flow for:
  - play before load
  - pause/resume
  - stop/reset
  - loading a second track after first
  - avoiding duplicate `requestAnimationFrame` loops
  - avoiding duplicate `MediaElementAudioSourceNode` creation
  - revoking stale object URLs when replacing local files
- Separated responsibilities across modules:
  - `audioEngine.js` for context/graph/source lifecycle
  - `musicPlayer.js` for playback/load state coordination
  - `playerUI.js` for DOM binding + control and analysis rendering
  - `app.js` for orchestration and loop wiring

## Working Now

- Local file flow is explicit and primary in UI
- Demo/bundled track flow remains available and clear for GitHub Pages mode
- Play/Pause/Stop state transitions are handled through one player state model
- Analysis values are readable and updating during playback
- Event logs remain readable while analysis logs are throttled

## Runtime Mode Notes

1. GitHub Pages / hosted demo:
   - Bundled asset path loading works with repository-relative URLs
2. Local browser usage:
   - User file loading works via browser file picker and object URLs

These modes differ in source origin and browser security behavior; they are intentionally both supported.

## Known Limitations

- No advanced visualizer redesign in this pass (intentionally out of scope)
- No automated browser integration tests in CLI
- Some external URLs may require CORS-compatible hosting to decode/analyse audio in browser
- `file://` module loading may fail in some browsers; local HTTP server is recommended

## Next Targets

- Add focused browser smoke-test evidence for key runtime states
- Move forward to the next visual layer pass without changing core audio loading contract
