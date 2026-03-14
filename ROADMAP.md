# ROADMAP

## Vision

Build a reusable web music engine that can run standalone and serve as the audio core for browser games.

## Current Position

- Stage: 3 - Lifecycle/load stable baseline accepted
- Date: 2026-03-15

## Completed

- Baseline project documentation
- Local-first workflow rules
- Initial source tree and module placeholders
- Browser bootstrap page and startup pipeline
- MVP audio analysis pipeline (local file -> playback -> analyser -> band metrics)
- First integrated canvas visualizer foundation (cosmic signal panel)
- Node network overlay MVP layer integrated into active visualizer path
- Lifecycle hardening pass:
  - explicit app/player phases
  - serialized latest-wins load orchestration
  - stale async load completion suppression
  - URL/demo deterministic load timeout path
  - unified UI/public API command pipeline
  - normalized pause/ended/stop analysis semantics
- Stop/loading race-closure patch:
  - in-flight load abort on STOP
  - in-flight load abort on superseding latest load
  - ended-vs-stop phase guard for late ended callbacks
- Baseline acceptance validation completed:
  - targeted abort/cancel fix-pass
  - manual browser smoke (UI + window.vizuPlayer parity)
  - post-fix re-audit PASS
  - remaining known console noise: missing favicon (non-blocking)
- Lightweight regression-check pass completed:
  - added deterministic headless command/phase regression harness (`scripts/regression/command-phase-regression.mjs`)
  - covered initial/bootstrap, load/play/pause/stop/stop-loading, latest-wins, stale-completion suppression, ended-stop guard, and UI/API parity path assumptions
  - local regression harness baseline result: 10/10 PASS
- Thin facade implementation pass (integration API shaping):
  - added canonical facade subset on `window.vizuPlayer`: `play()`, `pause()`, `stop()`, `loadTrack(url)`, `unload()`, `getState()`, `onStateChange()`
  - added orchestration-backed `unload()` reset path to force runtime back to `idle`
  - added stable public state snapshot contract and listener subscribe/unsubscribe semantics
  - expanded regression harness coverage for thin-facade behavior; local result: 13/13 PASS
- Thin facade tiny corrective pass (contract leak closure):
  - narrowed `window.vizuPlayer` to the canonical 7-method facade only
  - moved legacy/deep refs (`commands.*`, `loadDemoTrack`, `loadBundledDemoTrack`, `loadLocalFile`, `getAnalysis`, internals) to unstable debug namespace `window.__VIZUPLAYER_DEBUG__`
  - normalized public command methods to completion/error promises without exposing internal status taxonomy
  - strengthened regression harness with exact facade key checks and forbidden-key guards
- Debug source-reporting tiny pass (post-accept cleanup):
  - `AudioEngine.getCurrentSource()` now returns `""` when `src` and `getAttribute("src")` are empty after unload, avoiding stale browser `currentSrc`
  - added minimal targeted regression check `scripts/regression/unload-source-reporting-regression.mjs`
  - local validation: targeted regression PASS; command/phase baseline remains `13/13 PASS`
- Reactive Semantics Tuning / Luminous Cosmic Core narrow beauty-pass:
  - de-globalized amplitude pumping in secondary layers (`nebula`, `grid`, `panel frame`, bars luminous mass)
  - remapped core semantics: bass -> mass/radius, mid -> halo/flow field, treble -> white-hot core edge accents
  - re-semantized node network: less amplitude-led visibility, stronger mid-led structure/flow, bass-led body weight, rarer treble spark accents
  - constrained implementation to `src/visual/visualizer.js` and `src/visual/nodeNetwork.js`
  - local validation remains green: command/phase regression `13/13 PASS` and unload source-reporting regression `PASS`
- Cosmic Beauty Reframe broad beauty-pass:
  - rebuilt the scene in `src/visual/visualizer.js` into a five-layer depth stack (void backdrop, distant haze/dust, mid-field energy currents + plasma network, dominant layered cosmic core, selective foreground shards)
  - replaced bottom-widget spectrum semantics with an integrated orbital spectrum corona tied to the core object
  - removed schematic panel/grid feel and shifted motion language toward continuous drift/flow with selective highlights
  - rebuilt `src/visual/nodeNetwork.js` from a sparse fixed diagram into a denser adaptive plasma topology with curved links, flow drift, and traveling pulse accents
  - reframed `index.html` shell styling to support hero visual dominance and stronger composition cohesion while preserving all JS-bound DOM ids
  - local validation remains green: command/phase regression `13/13 PASS` and unload source-reporting regression `PASS`

## Active Next

- Execute manual visual validation of the Cosmic Beauty Reframe on 4 target scenarios:
  - bass-heavy track
  - mid-rich / vocal / synth-rich track
  - treble-bright track
  - pause / resume behavior
- Capture any targeted follow-up tuning notes only after track-by-track visual review.
- Keep the regression harness green as the lifecycle/load baseline safety net.

## Milestones

- M1: Foundation and structure
- M2: Playback + analysis MVP
- M3: Visualization and timing sync basics
- M4: Integration API for game clients
- M5: Hardening and packaging

