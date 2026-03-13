# CHANGELOG

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Initial documentation scaffold (`README.md`, `AGENTS.md`, `WORKFLOW.md`, `ROADMAP.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `CHECKLIST.md`, `CHANGELOG.md`)
- Local-first workflow rules
- Baseline project structure with `index.html`, `src/*`, `assets/*`, and `docs/*`
- Starter module files for audio, visual, UI, and core bootstrapping

### Updated

- Root `AGENTS.md` declared as canonical policy source and required sync target for local workspace and GitHub.
- Implemented MVP audio analysis pipeline:
  - local audio file selection
  - play/pause playback control
  - analyser wiring through Web Audio API
  - extracted bass/mid/treble/amplitude metrics
  - periodic structured console output for validation
