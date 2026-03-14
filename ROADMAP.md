# ROADMAP

## Vision

Build a reusable web music engine that can run standalone and serve as the audio core for browser games.

## Current Position

- Stage: 3 - Node network foundation stabilized with lifecycle hardening
- Date: 2026-03-14

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

## Active Next

- Run focused manual browser smoke validation for load races, timeout failures, and API parity.
- Add lightweight regression checks around command/phase transitions.
- Continue integration API shaping for game consumers on top of stabilized lifecycle behavior.

## Milestones

- M1: Foundation and structure
- M2: Playback + analysis MVP
- M3: Visualization and timing sync basics
- M4: Integration API for game clients
- M5: Hardening and packaging
