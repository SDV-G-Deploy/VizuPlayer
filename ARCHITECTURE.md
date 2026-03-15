# ARCHITECTURE

## Purpose

High-level architecture for **VizuPlayer Core** as a reusable browser audio engine and integration demo surface.

## Strategic Role

VizuPlayer is the core layer of the stack:

- Owns runtime playback semantics and lifecycle correctness
- Owns Web Audio analysis pipeline and stable host-facing facade
- Provides a demo/sandbox surface to validate integration behavior

It is not the standalone flagship consumer product surface.

## Core Responsibilities

- Source loading and media lifecycle handling (local file + URL/demo)
- Playback phase model and command orchestration
- Analysis sampling and normalized reactive metrics
- Stable integration facade contract on `window.vizuPlayer`
- Deterministic lifecycle behavior under rapid/reordered command sequences

## Non-Goals (For This Repo)

- End-to-end consumer product UX ownership
- App-layer onboarding, growth, or brand-polish strategy
- Large product-surface visual programs as a primary roadmap driver

Demo/UI work in this repository exists to validate and observe the core, not to define the final consumer app experience.

## Boundaries

### VizuPlayer Core Boundary (This Repository)

- Runtime engine internals (`src/audio/*`, orchestration, analysis)
- Stable public facade and state contract
- Integration demo shell for local/browser validation

### External App/Product Boundary (Adjacent Repository/Layer)

- Consumer-facing product narrative and interaction design
- Product-level visual language, onboarding, and retention loops
- App-specific feature packaging beyond core engine guarantees

## Current Layering

- Audio engine layer (`src/audio/audioEngine.js`)
- Playback phase/state layer (`src/audio/musicPlayer.js`)
- Analysis layer (`src/audio/analyser.js`)
- Orchestration + facade layer (`src/core/app.js`)
- Demo UI + visualization layer (`src/ui/*`, `src/visual/*`, `index.html`)

Integration is not a later afterthought: the facade/orchestration contract is already an active foundation of the current architecture.

## Stable Integration Contract

External hosts should integrate only through `window.vizuPlayer`:

- `play()`
- `pause()`
- `stop()`
- `loadTrack(url)`
- `unload()`
- `getState()`
- `onStateChange(listener) -> unsubscribe`

Deep runtime internals are intentionally separated into `window.__VIZUPLAYER_DEBUG__` and are not stable API commitments.

## Why The Demo Surface Exists

The current visual/demo surface is an integration proving ground:

- Demonstrates that playback + lifecycle + analysis contracts work end to end
- Helps validate state transitions and host behavior assumptions
- Provides fast local/browser feedback during core evolution

It should not be interpreted as the final flagship product layer.

## Known Constraints

- Browser autoplay restrictions require user gesture before playback
- `file://` module loading may be restricted; local HTTP serving is preferred
- External URL tracks may require CORS-compatible hosting for decode/analysis
- Transport-level network cancellation remains browser-managed best effort

## Architecture Direction (Next)

- Keep core behavior deterministic and regression-backed
- Increase API and consumption clarity for integrators
- Improve integration examples without widening into app-layer product scope
- Preserve strict boundary between engine concerns and standalone app concerns
