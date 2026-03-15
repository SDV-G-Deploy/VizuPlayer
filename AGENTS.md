# AGENTS

This file defines collaboration and execution rules for this repository.

## Source Of Truth

- Canonical rules file: `C:\ForCodexAnd\VizuPlayer\AGENTS.md` (this file).
- The same canonical file must stay up to date in GitHub: `https://github.com/SDV-G-Deploy/VizuPlayer/blob/main/AGENTS.md`.
- If any policy text in other docs conflicts with this file, this root `AGENTS.md` wins.

## Scope

- Local workspace: `C:\ForCodexAnd\VizuPlayer`
- Remote repository: `https://github.com/SDV-G-Deploy/VizuPlayer`
- Repository role: **Core / Engine / Integration Demo**
- Adjacent product role: consumer-facing standalone player evolves as a separate **App-surface** track

## Operating Model

1. VizuPlayer is core-first by default; it is not the flagship consumer app surface.
2. Work is split into two explicit tracks:
   - **Core Track (this repo):** runtime engine, integration contract, and honest demo validation surface.
   - **App Track (separate surface/repo):** consumer UX/product development and standalone app ambitions.
3. Core and App work must not silently mix into one ambiguous implementation stream.
4. Product-surface ambitions must not silently redefine this repository's role.
5. Demo surface may evolve, but it must stay honest about being an integration/demo layer.
6. Before broad UX/UI/visual passes, explicitly choose target:
   - Core demo improvement
   - App/product development
7. When positioning changes, docs sync is required in the same pass.

## Core Rules

1. Work happens in the local workspace first: `C:\ForCodexAnd\VizuPlayer`.
2. Changes are pushed to GitHub only after local validation/checks pass.
3. After each implementation pass, update all relevant `*.md` files with current status, what was done, and what is next.
4. If project positioning/process rules change, update at minimum: `AGENTS.md`, `WORKFLOW.md`, `CONTRIBUTING.md`, `CHECKLIST.md`, and `ROADMAP.md`.
5. Keep this root `AGENTS.md` current in both local workspace and GitHub `main` branch.

## Decision Log Template

- Date:
- Track: (Core demo improvement | App/product development)
- Change:
- Why:
- Validation:
- Docs updated:

## Open Sections

- Coding standards (TBD)
- Branch strategy (TBD)
- Release policy (TBD)
- Performance targets (TBD)
