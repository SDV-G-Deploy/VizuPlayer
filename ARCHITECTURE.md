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
  - exposes deterministic source-load timeout support for URL/demo loading
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
  - drives phase-derived status and control behavior
  - runs one render loop for metrics + visualizer
- `src/visual/visualizer.js`:
  - renders active visual layers from phase-aware analysis input
  - receives zero/decayed analysis during non-playing phases to prevent stale reactive visuals

## Known Constraints

- Browser autoplay restrictions require user gesture before playback
- `file://` module loading may be restricted; local HTTP serving is preferred
- External URL tracks may require CORS-compatible hosting for decode/analysis
- In-flight remote load cancellation is best-effort via source unload; stale completion suppression is the primary correctness guard

## Technical Questions (Next)

- Minimal regression harness for command/phase/load race transitions
- API surface for external game runtime control contracts
- Performance limits for per-frame analysis + rendering under heavier scenes
