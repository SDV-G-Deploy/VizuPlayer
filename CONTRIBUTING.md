# CONTRIBUTING

## Contribution Flow

1. Work locally in `C:\ForCodexAnd\VizuPlayer`.
2. Declare the target track for the pass.
3. Keep changes focused and reviewable.
4. Run local checks before push.
5. Update relevant `*.md` docs after each pass.
6. Push only after checks are green.

## Target Track Declaration (Required)

Use one of these labels in pass notes/PR description:

- `Track: Core demo improvement`
- `Track: App/product development (external app-surface)`

Default behavior: this repository accepts core/engine/integration-demo work. App-facing product work should be developed separately and only linked here when integration contracts are affected.

## Commit Message Template

`type(scope): short description`

Examples:

- `docs(governance): lock core-vs-app track model`
- `docs(workflow): add explicit UX target gate`
- `feat(core): add playback state machine skeleton`

## Review Checklist (Template)

- Requirement satisfied
- Target track explicitly declared
- No silent Core/App track mixing
- No obvious regressions
- Docs updated
- Checks passed
