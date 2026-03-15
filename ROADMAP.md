# ROADMAP

## Strategic Frame

VizuPlayer is positioned as **Core / Engine / Integration Demo**.

This repository is the reusable runtime foundation for browser integrations and future app surfaces, not the final consumer product layer.

## Governance Lock (2026-03-15)

- VizuPlayer repository remains core-first and does not become the flagship consumer app by default.
- Core work and App/product work run as separate tracks and must not silently merge into one pass.
- Broad UX/UI or visual passes require explicit target declaration first:
  - Core demo improvement
  - App/product development
- Demo surface evolution is valid when it improves integration clarity and stays honest about its role.
- When project positioning changes, governance/process docs must be synced in the same implementation pass.

## Current Position

- Stage: Core baseline stabilized and reusable
- Date: 2026-03-15
- Status: Runtime, playback lifecycle, analysis pipeline, and thin integration facade are stable enough for integration-oriented iteration

## Current Role

- Engine runtime for track loading, playback orchestration, and state transitions
- Integration surface via stable `window.vizuPlayer` facade
- Browser demo/sandbox that validates core behavior in real runtime conditions
- Foundation for adjacent standalone app surfaces that can build separate UX/product layers

## Completed Foundation (Relevant)

- Lifecycle/load hardening with explicit phase model and latest-wins orchestration
- Deterministic timeout/cancellation guardrails for load flows
- Stable thin facade contract (`play`, `pause`, `stop`, `loadTrack`, `unload`, `getState`, `onStateChange`)
- Lightweight deterministic regression harness for lifecycle/command semantics
- Visual/demo shell usable as integration validation surface
- Core-first demo-surface cohesion pass in `index.html` (positioning-aligned copy, clearer validation flow, improved responsive shell hierarchy)

## Workstreams

### 1. Core Stability

- Keep lifecycle/load semantics deterministic under race-prone scenarios
- Maintain regression baseline as a required gate for core runtime changes
- Continue narrow correctness passes without widening into app-layer concerns

### 2. Integration Readiness

- Improve integration documentation and host embedding guidance
- Add practical integration examples for browser game/runtime consumers
- Clarify host responsibilities vs. core responsibilities

### 3. API / Consumption Clarity

- Keep facade small, explicit, and versionable
- Document stable contract guarantees and error/state semantics
- Ensure debug namespace remains clearly non-contractual

### 4. Demo Surface Hygiene

- Keep demo shell useful for validation and debugging
- Avoid treating demo UX as flagship consumer product direction
- Allow targeted demo clarity improvements only when they improve integration confidence

### 5. Future Relationship to Standalone App

- Preserve a clean core/app split: runtime engine in this repo, product surface outside this repo
- Support external app surfaces through stable engine contracts
- Keep roadmap coordination points explicit without merging product ambitions into core scope

## Active Next

- Run manual browser validation of the updated core demo flow on desktop/mobile breakpoints
- Tighten API documentation for consumption readiness
- Add/refresh integration usage examples
- Continue separation discipline between core runtime work and app-surface product work
- Apply explicit Core-vs-App track declaration in each future pass before UX/UI scope expansion

## Explicit Non-Goals (This Repository)

- Building the flagship standalone consumer player inside VizuPlayer
- Running broad consumer UX/UI productization programs in this repo
- Expanding scope toward growth/brand/product-surface outcomes unrelated to engine readiness

## Milestones

- C1: Core runtime stability baseline (accepted)
- C2: Integration documentation and API clarity uplift (active)
- C3: Consumption/packaging readiness for external app surfaces
- C4: Ongoing core maintenance and integration evolution
