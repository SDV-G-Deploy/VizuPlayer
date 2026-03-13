# WORKFLOW

## Working Location

All development is performed locally in:

`C:\ForCodexAnd\VizuPlayer`

## Delivery Sequence

1. Implement changes locally.
2. Run local checks.
3. Update project documentation (`*.md`) with latest progress and plan.
4. Push to GitHub only if checks are green.

## Local Checks Template

- Build: TBD
- Unit tests: TBD
- Integration tests: TBD
- Manual smoke test: TBD

## Push Gate

Do not push if any required check fails.

## Post-Pass Documentation Update

After each code pass, update at least:

- `ROADMAP.md` (current position, done, next)
- `CHANGELOG.md` (entry for notable change)
- Any architecture/workflow file affected by the change
