# WORKFLOW

## Working Location

All development is performed locally in:

`C:\ForCodexAnd\VizuPlayer`

## Track Gate (Required)

Before implementation, declare one target track:

1. **Core demo improvement** (this repository)
2. **App/product development** (separate app-surface track)

Do not silently mix these tracks in one default pass.

## Delivery Sequence

1. Declare target track for the pass.
2. Implement scoped changes locally.
3. Run local checks.
4. Update docs affected by the pass.
5. If positioning/process changed, sync governance docs in the same pass.
6. Push to GitHub only if checks are green.

## UX/UI And Visual Work Gate

Before broad UX/UI/visual work, be explicit about intent:

- If the goal is **Core demo improvement**, keep the pass tied to integration clarity/validation.
- If the goal is **App/product development**, execute that work on the app-surface track instead of expanding this repo scope.

## Local Checks Template

- Syntax checks: `node --check` on all touched JS/MJS files
- Regression harness: `node scripts/regression/command-phase-regression.mjs`
- Build: TBD
- Unit tests: TBD
- Integration tests: TBD
- Manual smoke test: targeted browser smoke when behavior cannot be validated headlessly

## Push Gate

Do not push if any required check fails.

## Post-Pass Documentation Update

After each pass, update relevant docs. Typical minimum set:

- `ROADMAP.md` (current position, done, next)
- `CHANGELOG.md` (notable changes)
- `docs/PROJECT_STATE.md` and `docs/SESSION_LOG.md` (status trace)
- Root `AGENTS.md` if policy/governance changed

If project positioning changed, governance docs must stay aligned in the same pass:

- `AGENTS.md`
- `WORKFLOW.md`
- `CONTRIBUTING.md`
- `CHECKLIST.md`
