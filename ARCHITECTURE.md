# ARCHITECTURE

## Purpose

High-level architecture notes for the VizuPlayer engine.

## Target Platforms

- Web browsers (desktop/mobile)
- Browser game runtime environments

## Current Layering Direction

- Audio engine layer
- Playback coordination + phase model layer
- Analyser layer
- UI/player controls layer
- Visualizer layer
- Game integration API layer (later stage)

## Implemented Foundation (Current)

- `src/audio/audioEngine.js`:
  - owns `AudioContext`
  - owns `HTMLAudioElement`
  - builds stable media source -> analyser -> destination chain
  - loads local `File` sources and demo/url sources
  - revokes stale object URLs when replacing local tracks
  - exposes deterministic source-load timeout support for URL/demo loading and abort-aware load-wait cancellation
- `src/audio/musicPlayer.js`:
  - owns explicit playback phases (`idle/loading/ready/playing/paused/ended/error`)
  - tracks canonical load/playback metadata
  - exposes state transitions used by app orchestration
- `src/audio/analyser.js`:
  - samples analyser data each frame
  - computes `bass`, `mid`, `treble`, `amplitude`
- `src/ui/playerUI.js`:
  - binds DOM controls/events
  - renders status and live analysis values
  - updates button/input enabled/disabled states
- `src/core/app.js`:
  - bootstraps all modules
  - centralizes command orchestration for both UI and public API
  - serializes load requests with latest-wins semantics
  - suppresses stale load completion commits
  - aborts active in-flight load wait on stop invalidation and superseding latest-load requests
  - drives phase-derived status and control behavior
  - runs one render loop for metrics + visualizer
  - exports an injectable `bootstrap(options)` seam used by deterministic headless regression checks while preserving default browser auto-bootstrap behavior
- `src/visual/visualizer.js`:
  - renders active visual layers from phase-aware analysis input
  - receives zero/decayed analysis during non-playing phases to prevent stale reactive visuals
- `scripts/regression/command-phase-regression.mjs`:
  - lightweight Node harness (no external framework)
  - validates command/phase transitions and race-sensitive lifecycle boundaries against the stabilized Stage 3 baseline

## Known Constraints

- Browser autoplay restrictions require user gesture before playback
- `file://` module loading may be restricted; local HTTP serving is preferred
- External URL tracks may require CORS-compatible hosting for decode/analysis
- In-flight load-wait cancellation is deterministic via AbortSignal in orchestration; transport-level network cancellation remains browser-managed best effort
- Missing favicon warning may appear in browser console and is currently treated as non-blocking runtime noise

## Technical Questions (Next)

- How far to expand regression coverage beyond the current lightweight baseline without introducing heavy test infrastructure
- API surface for external game runtime control contracts
- Performance limits for per-frame analysis + rendering under heavier scenes

