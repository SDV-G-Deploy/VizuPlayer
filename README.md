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

## Current MVP Capabilities

Implemented and working in scope:

- Local file loading via browser file picker (`audio/*`) as primary flow
- Demo/URL track loading for hosted validation (including bundled asset path)
- Playback controls: `Play`, `Pause`, `Stop`
- Web Audio analysis pipeline
- Live on-page numeric metrics:
  - `bass`
  - `mid`
  - `treble`
  - `amplitude`
- Throttled structured analysis logging in browser console

Out of scope for this stage:

- Advanced visualizer redesign
- Shader/particle expansion
- Game integration API

## Runtime Modes

1. GitHub Pages / hosted demo:
   - Use bundled relative asset path (default input value) or another reachable audio URL
2. Local user flow:
   - Use local file picker to load audio from computer via object URL

These modes are both supported but rely on different browser source rules.

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
