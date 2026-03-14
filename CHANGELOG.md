# CHANGELOG

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Node network visual layer module in `src/visual/nodeNetwork.js`:
  - stable 8-node layout
  - constrained readable connections
  - glow rendering with subtle motion
  - idle + playback behavior with restrained analysis-driven reactivity
- Visualizer network config in `src/core/config.js`:
  - `visualizer.network.nodeRadius`

### Updated

- `src/visual/visualizer.js` now orchestrates the node-network layer together with existing spectrum/cosmic panel rendering.
- `src/core/app.js` now passes modular network config into the visualizer.
- Existing local-file primary flow, demo/url load flow, playback controls, and analysis metrics remain intact.
