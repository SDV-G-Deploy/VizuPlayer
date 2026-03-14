# ROADMAP

## Vision

Build a reusable web music engine that can run standalone and serve as the audio core for browser games.

## Current Position

- Stage: 3 - Lifecycle/load stable baseline accepted
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

## Active Next

- Keep the regression harness green as the lifecycle/load baseline safety net.
- Continue integration API shaping for game consumers on top of stabilized lifecycle behavior.

## Milestones

- M1: Foundation and structure
- M2: Playback + analysis MVP
- M3: Visualization and timing sync basics
- M4: Integration API for game clients
- M5: Hardening and packaging

