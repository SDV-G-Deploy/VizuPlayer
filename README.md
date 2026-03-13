# VizuPlayer

Reusable web music engine scaffold for browser and web-game integration.

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

## Current MVP (Audio Analysis)

Implemented and working in scope:

- Local audio file selection from disk
- Play and pause controls
- Web Audio API analysis pipeline
- Extracted metrics: `bass`, `mid`, `treble`, `amplitude`
- Periodic readable console output for validation

Out of scope for this stage:

- Canvas visualizer output
- Shader/particle systems
- Game integration API

## Local Run Note

Because the app uses ES modules, some browsers block `file://` loading.
Preferred local method is serving the project over HTTP, for example:

```powershell
cd C:\ForCodexAnd\VizuPlayer
python -m http.server 8080
```

Then open: `http://localhost:8080`

## Process Rules

1. Work locally first in `C:\ForCodexAnd\VizuPlayer`.
2. Push only after local checks pass.
3. Update relevant `*.md` docs after every code pass.
4. Root `AGENTS.md` is the canonical policy file and must stay current locally and in GitHub.

## Reference Docs

- [Root AGENTS](./AGENTS.md)
- [Workflow](./WORKFLOW.md)
- [Roadmap](./ROADMAP.md)
- [Project State](./docs/PROJECT_STATE.md)
- [Session Log](./docs/SESSION_LOG.md)
