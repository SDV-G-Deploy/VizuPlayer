# ARCHITECTURE

## Purpose

High-level architecture notes for the VizuPlayer engine.

## Target Platforms

- Web browsers (desktop/mobile)
- Browser game runtime environments

## Current Layering Direction

- Audio engine layer
- Analyser layer
- UI/player controls layer
- Visualizer layer (next stage)
- Game integration API layer (later stage)

## Implemented Foundation (Current)

- `audioEngine.js`:
  - owns `AudioContext`
  - owns `HTMLAudioElement`
  - builds stable media source -> analyser -> destination chain
  - handles local file loading and playback methods
- `analyser.js`:
  - owns analyser sampling
  - computes `bass`, `mid`, `treble`, `amplitude`
- `app.js`:
  - wires UI events to engine methods
  - runs frame loop and periodic structured logging

## Known Constraints

- Browser autoplay restrictions require user gesture before playback
- `file://` module loading may be restricted; local HTTP serving is preferred

## Technical Questions (Next)

- Shared timing contract between analyser and future visualizer
- API format for game integration consumers
- Performance limits for per-frame analysis + rendering
