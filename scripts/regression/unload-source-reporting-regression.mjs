import assert from "node:assert/strict";
import { AudioEngine } from "../../src/audio/audioEngine.js";

const audioEngine = new AudioEngine();
audioEngine.audioElement = {
  src: "",
  currentSrc: "https://example.test/stale-track.mp3",
  getAttribute(name) {
    return name === "src" ? "" : null;
  },
};

assert.equal(
  audioEngine.getCurrentSource(),
  "",
  "After unload, getCurrentSource() must not leak stale currentSrc when src is empty.",
);

console.log("PASS post-unload source-reporting");