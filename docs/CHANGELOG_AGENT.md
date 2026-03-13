# CHANGELOG_AGENT

## 2026-03-14

### Added

- Requested project folder layout (`src/audio`, `src/visual`, `src/ui`, `src/core`, `assets/music`, `assets/shaders`, `docs`)
- Starter files for all requested modules
- Documentation files in `docs/`

### Updated

- Governance rule: root `AGENTS.md` is the canonical and continuously updated policy file in local workspace and GitHub `main`.
- Implemented MVP audio analysis pipeline in core runtime:
  - file input based local track loading
  - play/pause controls with user-gesture-safe start
  - stable Web Audio signal chain with analyser node
  - bass/mid/treble/amplitude extraction and structured logging

### Notes

- Visual output remains out of scope for this stage and will be implemented next.
