# ARCHITECTURE

## Purpose

High-level architecture notes for the VizuPlayer engine.

## Target Platforms

- Web browsers (desktop/mobile)
- Browser game runtime environments

## Current Layering Direction

- Audio engine layer
- Playback coordination layer
- Analyser layer
- UI/player controls layer
- Visualizer layer (next stage)
- Game integration API layer (later stage)

## Implemented Foundation (Current)

- `src/audio/audioEngine.js`:
  - owns `AudioContext`
  - owns `HTMLAudioElement`
  - builds stable media source -> analyser -> destination chain
  - loads local `File` sources and demo/url sources
  - revokes stale object URLs when replacing local tracks
- `src/audio/musicPlayer.js`:
  - coordinates load/play/pause/stop state
  - guards invalid state transitions (play before load)
- `src/audio/analyser.js`:
  - samples analyser data each frame
  - computes `bass`, `mid`, `treble`, `amplitude`
- `src/ui/playerUI.js`:
  - binds DOM controls/events
  - renders status and live analysis values
  - updates button enabled/disabled states
- `src/core/app.js`:
  - bootstraps all modules
  - orchestrates event flow and analysis loop lifecycle
  - emits throttled structured console output

## Known Constraints

- Browser autoplay restrictions require user gesture before playback
- `file://` module loading may be restricted; local HTTP serving is preferred
- External URL tracks may require CORS-compatible hosting for decode/analysis

## Technical Questions (Next)

- Shared timing contract between analyser and future visualizer
- API format for game integration consumers
- Performance limits for per-frame analysis + rendering
