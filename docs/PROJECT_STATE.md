# PROJECT_STATE

## Current Focus

VizuPlayer is explicitly maintained as **Core / Engine / Integration Demo**.

Current work focuses on core reliability, integration readiness, consumption clarity, and a coherent integration-demo surface. Consumer-facing standalone app ambitions are intentionally split into an adjacent app-surface layer.

## Strategic Position

- VizuPlayer provides reusable runtime/audio-analysis capability for browser integrations.
- The in-repo visual/demo surface is a validation sandbox, not the flagship end-user product.
- Existing work remains valuable as the foundation for external app/product surfaces.

## Current Stage

- Stage: Core baseline stabilized and reusable
- Date: 2026-03-15

## Baseline Status

- Playback lifecycle model is explicit and stable (`idle/loading/ready/playing/paused/ended/error`).
- Load orchestration is race-hardened (serialized latest-wins + stale completion suppression + stop/supersede abort path).
- Public facade is thin and stable (`play`, `pause`, `stop`, `loadTrack`, `unload`, `getState`, `onStateChange`).
- Analysis pipeline and demo surface are operational for browser validation.
- Regression baseline remains green (`command-phase`: `13/13`, unload source-reporting: `PASS`).

## Current Role Of This Repository

- Runtime engine ownership
- Integration contract ownership
- Browser demo/sandbox ownership for integration proof

## Not The Role Of This Repository

- Final standalone consumer product ownership
- Product-surface UX leadership for mass-market positioning
- Broad wow-first app-layer roadmap execution

## Active Next

- Keep docs synchronized around core/app separation
- Improve API and host-consumption clarity
- Add integration-oriented usage examples and packaging readiness details
- Keep demo surface hygienic for validation while avoiding app-surface scope creep

## 2026-03-15 Update (Core vs App Governance Sync)

- Locked operating model in governance docs: this repo is Core / Engine / Integration Demo by default.
- Formalized separate tracks for Core work and App/product work to avoid silent scope mixing.
- Added explicit target gate before broad UX/UI or visual passes (Core demo improvement vs App/product development).
- Synced AGENTS.md, WORKFLOW.md, CONTRIBUTING.md, CHECKLIST.md, and ROADMAP.md to the same split.

## Validation Baseline

- `node scripts/regression/command-phase-regression.mjs` -> `SUMMARY 13/13 passing`
- `node scripts/regression/unload-source-reporting-regression.mjs` -> `PASS post-unload source-reporting`

## 2026-03-15 Update (Core Demo Surface Cohesion Pass)

- Reworked `index.html` as a clearer core-first integration surface instead of standalone-consumer messaging.
- Improved launch flow clarity (`quick demo`, `local file`, `URL/asset`) and runtime-panel framing while preserving all runtime DOM bindings.
- Increased visual cohesion and mobile/desktop readability through shell/card hierarchy and responsive tuning.
- Scope remained safe:
  - no `src/audio/*` changes
  - no lifecycle/loading/orchestration changes
  - no stable facade/API behavior changes

## 2026-03-15 Update (Core Positioning & Docs Sync)

- Repositioned repository documentation to explicitly describe VizuPlayer as Core/Engine/Integration Demo.
- Clarified separation between this repository (engine+demo responsibilities) and adjacent standalone app-surface responsibilities.
- Updated `README.md`, `ROADMAP.md`, `ARCHITECTURE.md`, and status logs to remove consumer-first ambiguity while preserving prior implementation value.

## Prior Work Retained As Foundation

- Lifecycle/load hardening and race-closure pass
- Thin facade contract shaping and corrective surface tightening
- Deterministic regression-check layer
- Visual/demo evolution work that remains useful as integration sandbox capability`r`n