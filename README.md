# VizuPlayer Core

Reusable web audio playback/analysis core for browser integrations, experiments, and adjacent app surfaces.

## Positioning

### What It Is

VizuPlayer is the core layer of the stack:

- Stable runtime for track loading, playback lifecycle, and state transitions
- Web Audio analysis pipeline (`bass`, `mid`, `treble`, `amplitude`)
- Thin, stable host facade on `window.vizuPlayer`
- Integration demo/sandbox that proves the core in a real browser surface

### What It Is Not

VizuPlayer is not positioned as:

- A flagship standalone consumer music player
- A polished end-user product surface
- A wow-first visual consumer app

The repository is intentionally optimized for core reliability and integration value.

### Who It Is For

- Browser game/runtime teams needing an embeddable playback+analysis engine
- Web app teams building a separate product surface on top of a stable audio core
- Internal/product engineers validating integration paths before app-layer packaging

### Current Scope

Implemented and in active scope:

- Local file loading and URL/demo loading paths
- Playback lifecycle controls (`play`, `pause`, `stop`, `unload`)
- Stable state API (`getState`, `onStateChange`)
- Race-hardened load orchestration with latest-wins semantics
- Browser demo shell for integration validation and debugging

Out of scope in this repository:

- Full standalone consumer product design/UX ownership
- Broad app-surface branding and growth-facing polish work
- Consumer roadmap commitments unrelated to core/integration readiness

### Relationship To App Surface

An adjacent/standalone app surface can consume VizuPlayer Core as its engine layer.

- VizuPlayer Core owns runtime behavior, playback semantics, analysis, and integration contract stability.
- External app surfaces own product UX, visual storytelling, onboarding, and consumer-facing differentiation.

This separation preserves architectural clarity while keeping current work immediately reusable.

## Stable Integration Facade

Public host integration should use only the stable facade on `window.vizuPlayer`:

- `play()`
- `pause()`
- `stop()`
- `loadTrack(url)`
- `unload()`
- `getState()`
- `onStateChange(listener) -> unsubscribe`

Command methods are completion/error promises; host state flow should rely on `getState()` snapshots and `onStateChange` transitions.

Deep internals are available only via `window.__VIZUPLAYER_DEBUG__` for local diagnostics and are not part of the stable public contract.

## Runtime Modes

1. Hosted demo/integration sandbox (bundled relative asset or reachable URL)
2. Local file flow (browser picker + object URL)

Both modes are supported for integration validation under normal browser source constraints.

## Local Run

Because the app uses ES modules, `file://` loading may be blocked.
Preferred local run method:

```powershell
cd C:\ForCodexAnd\VizuPlayer
python -m http.server 8080
```

Then open: `http://localhost:8080`

## Current Structure

```text
VizuPlayer/
  index.html
  src/
    audio/
      audioEngine.js
      analyser.js
      musicPlayer.js
    visual/
      visualizer.js
      nodeNetwork.js
      particles.js
    ui/
      playerUI.js
    core/
      config.js
      app.js
  assets/
    music/
    shaders/
  docs/
    PROJECT_STATE.md
    SESSION_LOG.md
    CHANGELOG_AGENT.md
    AGENTS.md
```

## Process Rules

1. Work locally first in `C:\ForCodexAnd\VizuPlayer`.
2. Push only after local checks pass.
3. Update relevant `*.md` docs after every implementation pass.
4. Root `AGENTS.md` is the canonical policy file and must stay current locally and in GitHub.

## Reference Docs

- [Root AGENTS](./AGENTS.md)
- [Workflow](./WORKFLOW.md)
- [Roadmap](./ROADMAP.md)
- [Architecture](./ARCHITECTURE.md)
- [Project State](./docs/PROJECT_STATE.md)
- [Session Log](./docs/SESSION_LOG.md)
