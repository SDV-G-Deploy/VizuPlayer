import assert from "node:assert/strict";

function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function waitForMicrotaskTurn() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    this.listeners.get(type).add(handler);
  }

  removeEventListener(type, handler) {
    if (!this.listeners.has(type)) {
      return;
    }

    this.listeners.get(type).delete(handler);
  }

  dispatchEvent(type, event = {}) {
    if (!this.listeners.has(type)) {
      return;
    }

    const handlers = Array.from(this.listeners.get(type));

    for (const handler of handlers) {
      handler(event);
    }
  }
}

class FakeAudioElement extends FakeEventTarget {
  constructor() {
    super();
    this.src = "";
    this.currentSrc = "";
  }
}

class FakeAudioEngine {
  constructor({ ignoreAbortForUrls = [] } = {}) {
    this.audioElement = new FakeAudioElement();
    this.analyserNode = {};
    this.audioContext = {
      state: "running",
      resume: async () => {},
    };

    this.pendingLoads = [];
    this.stopCallCount = 0;
    this.pauseCallCount = 0;
    this.playCallCount = 0;
    this.unloadCallCount = 0;
    this.currentSource = "";
    this.ignoreAbortForUrls = new Set(ignoreAbortForUrls);
  }

  async initializeGraph() {
    return {
      audioContext: this.audioContext,
      audioElement: this.audioElement,
      analyserNode: this.analyserNode,
    };
  }

  async loadFile(file, graphOptions = {}, loadOptions = {}) {
    const label = file?.name ? `file:${file.name}` : "file:unknown";
    return this.enqueueLoad(label, loadOptions.signal);
  }

  async loadUrl(url, graphOptions = {}, loadOptions = {}) {
    return this.enqueueLoad(url, loadOptions.signal);
  }

  enqueueLoad(url, signal = null) {
    const deferred = createDeferred();
    const entry = {
      url,
      signal,
      settled: false,
      deferred,
      abortHandler: null,
    };

    if (signal && typeof signal.addEventListener === "function") {
      const onAbort = () => {
        if (entry.settled) {
          return;
        }

        if (this.ignoreAbortForUrls.has(url)) {
          return;
        }

        entry.settled = true;
        deferred.reject(new Error("Audio load aborted."));
      };

      entry.abortHandler = onAbort;
      signal.addEventListener("abort", onAbort, { once: true });

      if (signal.aborted) {
        onAbort();
      }
    }

    this.pendingLoads.push(entry);
    return deferred.promise;
  }

  resolveLoad(url) {
    const entry = this.pendingLoads.find((item) => item.url === url && !item.settled);
    if (!entry) {
      throw new Error(`No pending load found for ${url}`);
    }

    entry.settled = true;
    this.currentSource = entry.url;
    this.audioElement.src = entry.url;
    this.audioElement.currentSrc = entry.url;
    entry.deferred.resolve();
  }

  rejectLoad(url, message = "load failed") {
    const entry = this.pendingLoads.find((item) => item.url === url && !item.settled);
    if (!entry) {
      throw new Error(`No pending load found for ${url}`);
    }

    entry.settled = true;
    entry.deferred.reject(new Error(message));
  }

  async play() {
    this.playCallCount += 1;
  }

  pause() {
    this.pauseCallCount += 1;
  }

  stop() {
    this.stopCallCount += 1;
  }

  unload() {
    this.unloadCallCount += 1;
    this.currentSource = "";
    this.audioElement.src = "";
    this.audioElement.currentSrc = "";
  }

  getCurrentSource() {
    return this.currentSource;
  }

  getAudioContext() {
    return this.audioContext;
  }

  getAudioElement() {
    return this.audioElement;
  }

  getAnalyserNode() {
    return this.analyserNode;
  }
}

class FakeUI {
  constructor() {
    this.handlers = {};
    this.status = "";
    this.statusHistory = [];
    this.controls = {};
    this.analysis = { bass: 0, mid: 0, treble: 0, amplitude: 0 };
    this.trackUrl = "";
    this.canvas = { nodeName: "CANVAS" };
  }

  initialize(defaultTrackUrl = "") {
    this.trackUrl = defaultTrackUrl;
  }

  bindEvents(handlers) {
    this.handlers = handlers;
  }

  getVisualizerCanvas() {
    return this.canvas;
  }

  setStatus(message) {
    this.status = message;
    this.statusHistory.push(message);
  }

  setControls(controls) {
    this.controls = { ...controls };
  }

  renderAnalysis(values) {
    this.analysis = {
      bass: Number(values?.bass || 0),
      mid: Number(values?.mid || 0),
      treble: Number(values?.treble || 0),
      amplitude: Number(values?.amplitude || 0),
    };
  }

  setTrackUrl(url) {
    this.trackUrl = String(url || "");
  }

  async trigger(handlerName, arg) {
    const handler = this.handlers[handlerName];
    if (typeof handler !== "function") {
      throw new Error(`Missing handler: ${handlerName}`);
    }

    return handler(arg);
  }
}

class FakeVisualizer {
  setFrameData(frame) {
    this.lastFrame = frame;
  }

  render(timestamp) {
    this.lastRenderTimestamp = timestamp;
  }

  destroy() {
    this.destroyed = true;
  }
}

class FakeAnalyser {
  sampleFrame() {
    return {
      analysis: { bass: 0, mid: 0, treble: 0, amplitude: 0 },
      frequencyData: new Uint8Array(0),
    };
  }
}

class FakeWindow extends FakeEventTarget {}

function createTestConfig() {
  return {
    appName: "VizuPlayer",
    version: "test",
    playback: {
      bundledDemoTrackUrl: "bundled://demo-track",
      urlLoadTimeoutMs: 12000,
    },
    ui: {},
    analyser: {
      fftSize: 2048,
      smoothingTimeConstant: 0.82,
      logIntervalMs: 400,
      enableLogging: false,
      bands: {
        bass: [20, 250],
        mid: [250, 2000],
        treble: [2000, 8000],
      },
    },
    visualizer: {
      barCount: 16,
      pausedAnalysisDecayAlpha: 0.14,
      network: {
        nodeRadius: 5.4,
      },
    },
  };
}

let rafIdSequence = 0;

function createRafStub() {
  return {
    requestAnimationFrame() {
      rafIdSequence += 1;
      return rafIdSequence;
    },
    cancelAnimationFrame() {
      return;
    },
  };
}

async function createHarness({ fakeEngineOptions = {} } = {}) {
  globalThis.__VIZUPLAYER_DISABLE_AUTO_BOOTSTRAP__ = true;
  const { bootstrap } = await import("../../src/core/app.js");
  delete globalThis.__VIZUPLAYER_DISABLE_AUTO_BOOTSTRAP__;

  const fakeEngine = new FakeAudioEngine(fakeEngineOptions);
  const fakeUI = new FakeUI();
  const fakeWindow = new FakeWindow();
  const fakeVisualizer = new FakeVisualizer();
  const raf = createRafStub();

  const runtime = await bootstrap({
    appConfig: createTestConfig(),
    createAudioEngine: () => fakeEngine,
    createUI: () => fakeUI,
    createVisualizer: () => fakeVisualizer,
    createAnalyser: () => new FakeAnalyser(),
    windowTarget: fakeWindow,
    requestAnimationFrame: () => raf.requestAnimationFrame(),
    cancelAnimationFrame: (id) => raf.cancelAnimationFrame(id),
    logger: { info: () => {} },
    exposeRuntimeOnWindow: true,
  });

  return {
    runtime,
    fakeEngine,
    fakeUI,
    fakeWindow,
  };
}

function assertPhase(runtime, expected, message) {
  const state = runtime.getState();
  assert.equal(state.phase, expected, message);
}

const STABLE_PHASES = ["idle", "loading", "ready", "playing", "paused", "ended", "error"];
const STABLE_STATE_KEYS = ["phase", "hasTrackLoaded", "isPlaying", "trackLabel", "errorMessage"];
const PUBLIC_FACADE_KEYS = ["play", "pause", "stop", "loadTrack", "unload", "getState", "onStateChange"];
const FORBIDDEN_PUBLIC_KEYS = [
  "commands",
  "loadDemoTrack",
  "loadBundledDemoTrack",
  "loadLocalFile",
  "getAnalysis",
  "audioEngine",
  "ui",
  "visualizer",
  "config",
];

function assertStableStateSnapshot(snapshot, message) {
  assert.deepEqual(
    Object.keys(snapshot).sort(),
    [...STABLE_STATE_KEYS].sort(),
    message,
  );
  assert.equal(STABLE_PHASES.includes(snapshot.phase), true, `${message} (phase)`);
  assert.equal(typeof snapshot.hasTrackLoaded, "boolean", `${message} (hasTrackLoaded)`);
  assert.equal(typeof snapshot.isPlaying, "boolean", `${message} (isPlaying)`);
  assert.equal(typeof snapshot.trackLabel, "string", `${message} (trackLabel)`);
  assert.equal(typeof snapshot.errorMessage, "string", `${message} (errorMessage)`);
}

async function scenarioInitialBootstrap() {
  const { runtime, fakeUI, fakeWindow } = await createHarness();

  const state = runtime.getState();
  assertStableStateSnapshot(state, "Initial public state should match stable contract");
  assert.equal(state.phase, "idle", "Initial phase should be idle");
  assert.equal(state.hasTrackLoaded, false, "Initial state should not have a loaded track");
  assert.equal(fakeUI.status, "waiting for track", "Initial status should be waiting for track");
  assert.equal(fakeUI.controls.canPlay, false, "Play should be disabled initially");
  assert.equal(fakeUI.controls.canPause, false, "Pause should be disabled initially");
  assert.equal(fakeUI.controls.canStop, false, "Stop should be disabled initially");
  assert.deepEqual(
    Object.keys(runtime).sort(),
    [...PUBLIC_FACADE_KEYS].sort(),
    "Public facade should expose only canonical methods",
  );

  for (const key of FORBIDDEN_PUBLIC_KEYS) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(runtime, key),
      false,
      "Public facade should not expose forbidden key: " + key,
    );
  }

  assert.equal(typeof runtime.onStateChange, "function", "Public facade should expose onStateChange");
  assert.equal(fakeWindow.vizuPlayer, runtime, "Runtime should be exposed on window target");
  assert.equal(
    typeof fakeWindow.__VIZUPLAYER_DEBUG__,
    "object",
    "Debug namespace should be exposed separately for unstable internals",
  );
}

async function scenarioLoadToReady() {
  const { runtime, fakeEngine } = await createHarness();

  const loadPromise = runtime.loadTrack("track://load-ready");
  await waitForMicrotaskTurn();

  assertPhase(runtime, "loading", "Phase should enter loading after load command");

  fakeEngine.resolveLoad("track://load-ready");
  const loadResult = await loadPromise;

  assert.equal(loadResult, undefined, "Public loadTrack should not expose internal status payload");
  const state = runtime.getState();
  assertStableStateSnapshot(state, "Loaded state should match stable contract");
  assert.equal(state.phase, "ready", "Phase should be ready after successful load");
  assert.equal(state.hasTrackLoaded, true, "Track should be marked loaded after successful load");
  assert.equal(state.trackLabel, "track://load-ready", "Track label should match loaded URL");
}

async function scenarioPlayFromReady() {
  const { runtime, fakeEngine } = await createHarness();

  const loadPromise = runtime.loadTrack("track://play-ready");
  await waitForMicrotaskTurn();
  fakeEngine.resolveLoad("track://play-ready");
  await loadPromise;

  const playResult = await runtime.play();

  assert.equal(playResult, undefined, "Public play should not expose internal status payload");
  assertPhase(runtime, "playing", "Phase should be playing after play command");
  assert.equal(fakeEngine.playCallCount, 1, "Audio engine play should be called once");
}

async function scenarioPauseFromPlaying() {
  const { runtime, fakeEngine } = await createHarness();

  const loadPromise = runtime.loadTrack("track://pause-flow");
  await waitForMicrotaskTurn();
  fakeEngine.resolveLoad("track://pause-flow");
  await loadPromise;
  await runtime.play();

  const pauseResult = await runtime.pause();

  assert.equal(pauseResult, undefined, "Public pause should not expose internal status payload");
  assertPhase(runtime, "paused", "Phase should be paused after pause command");
  assert.equal(fakeEngine.pauseCallCount, 1, "Audio engine pause should be called once");
}

async function scenarioStopFromPlaying() {
  const { runtime, fakeEngine } = await createHarness();

  const loadPromise = runtime.loadTrack("track://stop-playing");
  await waitForMicrotaskTurn();
  fakeEngine.resolveLoad("track://stop-playing");
  await loadPromise;
  await runtime.play();

  const stopResult = await runtime.stop();

  assert.equal(stopResult, undefined, "Public stop should not expose internal status payload");
  const state = runtime.getState();
  assert.equal(state.phase, "ready", "Stop from playing should return to ready");
  assert.equal(state.hasTrackLoaded, true, "Stop from playing should retain loaded track metadata");
  assert.equal(fakeEngine.stopCallCount >= 2, true, "Audio engine stop should be called for load setup and stop");
}

async function scenarioStopDuringLoading() {
  const { runtime, fakeEngine } = await createHarness();

  const loadPromise = runtime.loadTrack("track://stop-during-loading");
  await waitForMicrotaskTurn();

  assertPhase(runtime, "loading", "Phase should be loading before stop during loading");

  const stopResult = await runtime.stop();
  await loadPromise;

  assert.equal(stopResult, undefined, "Public stop should not expose internal status payload while loading");
  const state = runtime.getState();
  assert.equal(state.phase, "idle", "Stop during loading should reset phase to idle");
  assert.equal(state.hasTrackLoaded, false, "Stop during loading should clear loaded-track state");
  assert.equal(fakeEngine.unloadCallCount, 1, "Stop during loading should unload source once");
}

async function scenarioUnloadResetsRuntimeToIdle() {
  const { runtime, fakeEngine } = await createHarness();

  const loadPromise = runtime.loadTrack("track://unload-ready");
  await waitForMicrotaskTurn();
  fakeEngine.resolveLoad("track://unload-ready");
  await loadPromise;
  await runtime.play();

  const unloadResult = await runtime.unload();

  assert.equal(unloadResult, undefined, "Public unload should not expose internal status payload");
  const state = runtime.getState();
  assertStableStateSnapshot(state, "Unload state should match stable contract");
  assert.equal(state.phase, "idle", "Unload should force idle phase");
  assert.equal(state.hasTrackLoaded, false, "Unload should clear loaded-track state");
  assert.equal(state.isPlaying, false, "Unload should reset playing flag");
  assert.equal(state.trackLabel, "", "Unload should clear track label");
  assert.equal(fakeEngine.unloadCallCount, 1, "Unload should clear engine source exactly once");
  assert.equal(fakeEngine.getCurrentSource(), "", "Unload should clear engine source URL");
}

async function scenarioUnloadDuringLoading() {
  const { runtime, fakeEngine } = await createHarness();

  const loadPromise = runtime.loadTrack("track://unload-during-loading");
  await waitForMicrotaskTurn();
  assertPhase(runtime, "loading", "Phase should be loading before unload during loading");

  const unloadResult = await runtime.unload();
  await loadPromise;

  assert.equal(unloadResult, undefined, "Public unload should not expose internal status payload while loading");
  const state = runtime.getState();
  assertStableStateSnapshot(state, "Unload-during-loading state should match stable contract");
  assert.equal(state.phase, "idle", "Unload during loading should end in idle");
  assert.equal(state.hasTrackLoaded, false, "Unload during loading should clear loaded-track state");
  assert.equal(fakeEngine.unloadCallCount, 1, "Unload during loading should clear source once");
}

async function scenarioLatestWinsRapidLoadAB() {
  const { runtime, fakeEngine } = await createHarness();

  const loadA = runtime.loadTrack("track://rapid-A");
  await waitForMicrotaskTurn();

  const loadB = runtime.loadTrack("track://rapid-B");
  await waitForMicrotaskTurn();

  const loadAResult = await loadA;
  assert.equal(loadAResult, undefined, "Superseded public loadTrack should resolve without status payload");

  fakeEngine.resolveLoad("track://rapid-B");
  const loadBResult = await loadB;
  assert.equal(loadBResult, undefined, "Latest public loadTrack should resolve without status payload");

  const state = runtime.getState();
  assert.equal(state.phase, "ready", "Final phase should be ready after latest load completion");
  assert.equal(state.trackLabel, "track://rapid-B", "Final loaded track should be B");
}

async function scenarioStaleCompletionIgnored() {
  const { runtime, fakeEngine } = await createHarness({
    fakeEngineOptions: { ignoreAbortForUrls: ["track://stale-A"] },
  });

  const loadA = runtime.loadTrack("track://stale-A");
  await waitForMicrotaskTurn();

  const loadB = runtime.loadTrack("track://stale-B");
  await waitForMicrotaskTurn();

  fakeEngine.resolveLoad("track://stale-A");
  const loadAResult = await loadA;
  assert.equal(loadAResult, undefined, "Stale public loadTrack should resolve without status payload");

  await waitForMicrotaskTurn();
  fakeEngine.resolveLoad("track://stale-B");
  const loadBResult = await loadB;
  assert.equal(loadBResult, undefined, "Committed public loadTrack should resolve without status payload");

  const state = runtime.getState();
  assert.equal(state.trackLabel, "track://stale-B", "Stale completion must not overwrite newer track metadata");
  assert.equal(state.phase, "ready", "Phase should remain ready for the newer committed load");
}

async function scenarioEndedDoesNotOverwriteExplicitStop() {
  const { runtime, fakeEngine } = await createHarness();

  const loadPromise = runtime.loadTrack("track://ended-guard");
  await waitForMicrotaskTurn();
  fakeEngine.resolveLoad("track://ended-guard");
  await loadPromise;

  await runtime.play();
  await runtime.stop();
  assertPhase(runtime, "ready", "Explicit stop should set ready phase before ended event");

  fakeEngine.audioElement.dispatchEvent("ended", {});

  const state = runtime.getState();
  assert.equal(state.phase, "ready", "Late ended callback must not overwrite explicit stop phase");
}

async function scenarioOnStateChangeSubscribeUnsubscribe() {
  const { runtime, fakeEngine } = await createHarness();
  const snapshots = [];

  const unsubscribe = runtime.onStateChange((snapshot) => {
    assertStableStateSnapshot(snapshot, "State listener payload should match stable contract");
    snapshots.push(snapshot);
  });

  assert.equal(snapshots.length, 1, "Listener should receive current snapshot on subscribe");
  assert.equal(snapshots[0].phase, "idle", "Initial emitted snapshot should be idle");

  const loadPromise = runtime.loadTrack("track://state-stream");
  await waitForMicrotaskTurn();
  assert.equal(snapshots.at(-1).phase, "loading", "Listener should emit loading transition");

  fakeEngine.resolveLoad("track://state-stream");
  await loadPromise;
  assert.equal(snapshots.at(-1).phase, "ready", "Listener should emit ready transition");

  await runtime.play();
  assert.equal(snapshots.at(-1).phase, "playing", "Listener should emit playing transition");

  unsubscribe();
  await runtime.pause();
  assert.equal(snapshots.at(-1).phase, "playing", "Unsubscribed listener must stop receiving updates");
}

async function scenarioUiApiParityEntrypoints() {
  const { runtime, fakeEngine, fakeUI } = await createHarness();

  const loadPromise = runtime.loadTrack("track://parity");
  await waitForMicrotaskTurn();
  fakeEngine.resolveLoad("track://parity");
  await loadPromise;

  await fakeUI.trigger("onPlay");
  assertPhase(runtime, "playing", "UI play handler should use shared command orchestration");

  await runtime.pause();
  assertPhase(runtime, "paused", "Public API pause should transition the same runtime state");

  await runtime.play();
  assertPhase(runtime, "playing", "Public API play should transition the same runtime state");

  await fakeUI.trigger("onStop");
  assertPhase(runtime, "ready", "UI stop handler should share stop orchestration with API callers");
}

const scenarios = [
  ["initial bootstrap state", scenarioInitialBootstrap],
  ["loadTrack alias -> ready", scenarioLoadToReady],
  ["play from ready", scenarioPlayFromReady],
  ["pause from playing", scenarioPauseFromPlaying],
  ["stop from playing", scenarioStopFromPlaying],
  ["stop during loading", scenarioStopDuringLoading],
  ["unload resets runtime to idle", scenarioUnloadResetsRuntimeToIdle],
  ["unload during loading", scenarioUnloadDuringLoading],
  ["latest-wins rapid load A -> B", scenarioLatestWinsRapidLoadAB],
  ["stale completion ignored", scenarioStaleCompletionIgnored],
  ["ended does not overwrite explicit stop", scenarioEndedDoesNotOverwriteExplicitStop],
  ["onStateChange subscribe/unsubscribe", scenarioOnStateChangeSubscribeUnsubscribe],
  ["UI/public API parity entrypoints", scenarioUiApiParityEntrypoints],
];

const results = [];

for (const [name, runScenario] of scenarios) {
  try {
    await runScenario();
    results.push({ name, status: "PASS" });
    console.log(`PASS ${name}`);
  } catch (error) {
    const message = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
    results.push({ name, status: "FAIL", message });
    console.error(`FAIL ${name}`);
    console.error(message);
  }
}

const failed = results.filter((result) => result.status === "FAIL");
console.log(`SUMMARY ${results.length - failed.length}/${results.length} passing`);

if (failed.length > 0) {
  process.exitCode = 1;
}
