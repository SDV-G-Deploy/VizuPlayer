# PROJECT_STATE

## Current Focus

Node-network overlay MVP on top of the working modular cosmic signal visualizer.

## Current Stage

- Stage: 3 - Node network overlay MVP
- Date: 2026-03-14

## Implemented In This Pass

- Kept the current working local file picker flow and demo/url loading flow unchanged.
- Kept transport controls (`Play`, `Pause`, `Stop`) and on-page metrics (`bass`, `mid`, `treble`, `amplitude`) unchanged.
- Activated `src/visual/nodeNetwork.js` as a real render module with:
  - stable intentional node layout (8 nodes)
  - clean constrained edge map (13 links)
  - subtle idle breathing and motion
  - restrained playback reactivity tied to analysis bands
- Integrated node-network rendering into the active canvas path in `src/visual/visualizer.js` without replacing existing bar-spectrum behavior.
- Kept one animation loop in `src/core/app.js`; no extra render loop was introduced.
- Extended visualizer config in `src/core/config.js` with modular network settings (`visualizer.network.nodeRadius`).

## Working Now

- Idle visual state remains calm and alive (soft network breathing/pulse with low-intensity glow).
- During playback, spectrum bars and node network coexist in the same scene.
- Pause decays network activity toward idle behavior (no runaway flashing).
- Stop returns network and analysis-driven effects to idle baseline.
- Track replacement path remains intact.

## Known Limitations

- No edge particles/flow simulation yet.
- No procedural background system, Three.js, shaders, or external libs (intentionally out of scope).
- No in-app visual tuning UI yet.
- Full runtime validation still requires manual browser smoke testing.

## Next Targets

- Tune node/line weighting and color hierarchy in browser playtests.
- Add optional low-volume edge energy travel accents (next layered pass).
- Define a clean external visual-state contract for future game embedding.
