const ZERO_NORMALIZED = Object.freeze({
  bass: 0,
  mid: 0,
  treble: 0,
  amplitude: 0,
});

const DEFAULT_LAYOUT = Object.freeze([
  { x: 0.5, y: 0.36, weight: 1.45, drift: 1.15, phase: 0.2, accent: true },
  { x: 0.34, y: 0.3, weight: 1.1, drift: 0.95, phase: 1.1, accent: false },
  { x: 0.66, y: 0.3, weight: 1.1, drift: 0.95, phase: 2.4, accent: false },
  { x: 0.24, y: 0.44, weight: 0.9, drift: 0.85, phase: 3.2, accent: true },
  { x: 0.76, y: 0.44, weight: 0.9, drift: 0.85, phase: 4.3, accent: true },
  { x: 0.39, y: 0.55, weight: 1, drift: 0.9, phase: 5, accent: false },
  { x: 0.61, y: 0.55, weight: 1, drift: 0.9, phase: 5.8, accent: false },
  { x: 0.5, y: 0.22, weight: 0.82, drift: 0.75, phase: 0.9, accent: true },
]);

const DEFAULT_CONNECTIONS = Object.freeze([
  [0, 1, 1],
  [0, 2, 1],
  [0, 5, 0.95],
  [0, 6, 0.95],
  [1, 2, 0.75],
  [1, 3, 0.85],
  [2, 4, 0.85],
  [1, 5, 0.72],
  [2, 6, 0.72],
  [5, 6, 0.8],
  [7, 0, 0.68],
  [7, 1, 0.7],
  [7, 2, 0.7],
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(from, to, alpha) {
  return from + (to - from) * alpha;
}

function toNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function normalizeAnalysis(analysis) {
  return {
    bass: clamp(toNumber(analysis?.bass), 0, 1),
    mid: clamp(toNumber(analysis?.mid), 0, 1),
    treble: clamp(toNumber(analysis?.treble), 0, 1),
    amplitude: clamp(toNumber(analysis?.amplitude), 0, 1),
  };
}

function createNodeRuntime(node, index, nodeRadius) {
  const seed = (Math.sin((index + 1) * 2.17) + 1) * 0.5;

  return {
    nx: clamp(toNumber(node.x), 0.08, 0.92),
    ny: clamp(toNumber(node.y), 0.12, 0.78),
    weight: clamp(toNumber(node.weight) || 1, 0.65, 1.8),
    drift: clamp(toNumber(node.drift) || 1, 0.45, 1.6),
    phase: toNumber(node.phase) || index * 0.8,
    accent: Boolean(node.accent),
    motionX: 0.7 + seed * 0.8,
    motionY: 0.7 + (1 - seed) * 0.8,
    motionSpeedX: 0.00055 + seed * 0.00032,
    motionSpeedY: 0.00045 + (1 - seed) * 0.00034,
    pulseSpeed: 0.0034 + seed * 0.0019,
    x: 0,
    y: 0,
    radius: nodeRadius,
    coreAlpha: 0.35,
    spark: 0,
  };
}

function normalizeLayout(layout) {
  if (!Array.isArray(layout) || layout.length < 6) {
    return DEFAULT_LAYOUT;
  }

  return layout;
}

function parseConnection(entry) {
  if (Array.isArray(entry) && entry.length >= 2) {
    return { from: entry[0], to: entry[1], weight: entry[2] };
  }

  if (entry && typeof entry === "object") {
    return {
      from: entry.from,
      to: entry.to,
      weight: entry.weight,
    };
  }

  return null;
}

function normalizeConnections(connections, nodeCount) {
  const source = Array.isArray(connections) && connections.length > 0 ? connections : DEFAULT_CONNECTIONS;
  const uniquePairs = new Set();
  const result = [];

  for (let index = 0; index < source.length; index += 1) {
    const parsed = parseConnection(source[index]);
    if (!parsed) {
      continue;
    }

    const from = Math.floor(toNumber(parsed.from));
    const to = Math.floor(toNumber(parsed.to));
    if (from < 0 || to < 0 || from >= nodeCount || to >= nodeCount || from === to) {
      continue;
    }

    const key = from < to ? `${from}-${to}` : `${to}-${from}`;
    if (uniquePairs.has(key)) {
      continue;
    }

    uniquePairs.add(key);
    result.push({
      from,
      to,
      weight: clamp(toNumber(parsed.weight) || 0.8, 0.45, 1.4),
      phase: index * 0.93 + 0.27,
      index: result.length,
    });
  }

  if (result.length > 0) {
    return result;
  }

  const fallback = [];
  for (let index = 0; index < nodeCount - 1; index += 1) {
    fallback.push({
      from: index,
      to: index + 1,
      weight: 0.8,
      phase: index * 0.9,
      index,
    });
  }

  return fallback;
}

export class NodeNetwork {
  constructor({ layout = DEFAULT_LAYOUT, connections = DEFAULT_CONNECTIONS, nodeRadius = 5.4 } = {}) {
    const safeLayout = normalizeLayout(layout);
    const safeRadius = clamp(toNumber(nodeRadius) || 5.4, 3.5, 12);

    this.nodeRadius = safeRadius;
    this.nodes = safeLayout.map((node, index) => createNodeRuntime(node, index, safeRadius));
    this.connections = normalizeConnections(connections, this.nodes.length);
    this.energy = {
      bass: 0.1,
      mid: 0.12,
      treble: 0.08,
      amplitude: 0.12,
    };
    this.visibility = 0.28;
  }

  render(
    ctx,
    {
      width = 0,
      height = 0,
      timestamp = 0,
      normalizedAnalysis = ZERO_NORMALIZED,
      isPlaying = false,
    } = {},
  ) {
    if (!ctx || width <= 0 || height <= 0 || this.nodes.length === 0) {
      return;
    }

    const analysis = normalizeAnalysis(normalizedAnalysis);
    this.updateEnergy(analysis, timestamp, isPlaying);
    this.updateNodes(width, height, timestamp, isPlaying);
    this.drawConnections(ctx, timestamp, isPlaying);
    this.drawNodes(ctx, timestamp);
  }

  updateEnergy(analysis, timestamp, isPlaying) {
    const idleBreath = 0.08 + Math.sin(timestamp * 0.00062) * 0.025;
    const targets = isPlaying
      ? analysis
      : {
          bass: idleBreath * 0.65,
          mid: idleBreath * 0.75,
          treble: 0.04 + Math.sin(timestamp * 0.0009 + 1.4) * 0.02,
          amplitude: 0.06 + Math.sin(timestamp * 0.00056 + 0.8) * 0.025,
        };
    const smoothing = isPlaying ? 0.18 : 0.04;

    this.energy.bass = lerp(this.energy.bass, targets.bass, smoothing);
    this.energy.mid = lerp(this.energy.mid, targets.mid, smoothing);
    this.energy.treble = lerp(this.energy.treble, targets.treble, smoothing);
    this.energy.amplitude = lerp(this.energy.amplitude, targets.amplitude, smoothing * 0.9);

    const targetVisibility = clamp(
      0.16 + this.energy.mid * 0.34 + this.energy.bass * 0.1 + this.energy.amplitude * 0.12,
      0.12,
      0.64,
    );
    this.visibility = lerp(this.visibility, targetVisibility, isPlaying ? 0.14 : 0.05);
  }

  updateNodes(width, height, timestamp, isPlaying) {
    const motionScale = Math.min(width, height) / 220;

    for (const node of this.nodes) {
      const motionGain = isPlaying ? 0.76 + this.energy.mid * 0.94 : 0.5 + this.energy.mid * 0.3;
      const offsetX =
        Math.sin(timestamp * node.motionSpeedX + node.phase) * node.drift * node.motionX * motionGain;
      const offsetY =
        Math.cos(timestamp * node.motionSpeedY + node.phase * 1.13) *
        node.drift *
        node.motionY *
        motionGain;

      node.x = node.nx * width + offsetX * motionScale;
      node.y = node.ny * height + offsetY * motionScale;

      const pulseWave = 0.5 + 0.5 * Math.sin(timestamp * node.pulseSpeed + node.phase * 2.4);
      const bassPulse = this.energy.bass * (0.46 + node.weight * 0.52);
      const ampPulse = this.energy.amplitude * 0.09;
      const breathingPulse = isPlaying ? pulseWave * (0.085 + this.energy.mid * 0.035) : pulseWave * 0.04;
      node.radius = this.nodeRadius * node.weight * (1 + bassPulse + ampPulse + breathingPulse);
      node.coreAlpha = clamp(0.2 + this.visibility * 0.34 + this.energy.mid * 0.08 + pulseWave * 0.04, 0.16, 0.72);
      node.spark = node.accent
        ? clamp((this.energy.treble - 0.16) * (0.22 + pulseWave * 0.5), 0, 0.62)
        : 0;
    }
  }

  drawConnections(ctx, timestamp, isPlaying) {
    const lineBase = 0.06 + this.energy.mid * 0.3 + this.energy.bass * 0.06 + this.energy.amplitude * 0.06;
    const glowAlpha = clamp((0.02 + this.energy.mid * 0.12 + this.energy.treble * 0.04) * this.visibility, 0.015, 0.18);

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = `rgba(88, 201, 252, ${glowAlpha})`;
    ctx.shadowBlur = 1.8 + this.energy.mid * 3 + this.energy.amplitude * 1.2;

    for (const connection of this.connections) {
      const from = this.nodes[connection.from];
      const to = this.nodes[connection.to];

      if (!from || !to) {
        continue;
      }

      const breath = 0.86 + 0.14 * Math.sin(timestamp * 0.001 + connection.phase);
      const canFlicker = isPlaying && this.energy.treble > 0.34 && connection.index % 5 === 0;
      const flicker = canFlicker
        ? (0.012 + this.energy.treble * 0.045) *
          (0.5 + 0.5 * Math.sin(timestamp * 0.011 + connection.phase * 6))
        : 0;
      const alpha = clamp((lineBase * breath + flicker) * this.visibility, 0.016, 0.34);
      const width = 0.5 + connection.weight * 0.52 + this.energy.mid * 0.5 + this.energy.bass * 0.1;

      ctx.strokeStyle = `rgba(68, 154, 232, ${alpha * 0.34})`;
      ctx.lineWidth = width + 0.85;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      ctx.strokeStyle = `rgba(156, 226, 255, ${alpha * 0.84})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawNodes(ctx, timestamp) {
    ctx.save();

    for (const node of this.nodes) {
      const haloRadius = node.radius * (1.5 + this.energy.mid * 0.45 + this.energy.amplitude * 0.18);
      const halo = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, haloRadius);
      halo.addColorStop(0, `rgba(116, 236, 255, ${clamp(node.coreAlpha * 0.24 + this.energy.mid * 0.04, 0.035, 0.28)})`);
      halo.addColorStop(0.65, `rgba(74, 165, 236, ${clamp(node.coreAlpha * 0.09 + this.energy.mid * 0.025, 0.018, 0.14)})`);
      halo.addColorStop(1, "rgba(26, 68, 126, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(node.x, node.y, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = `rgba(118, 224, 255, ${0.08 + node.coreAlpha * 0.2})`;
      ctx.shadowBlur = 2.2 + node.radius * 0.72 + this.energy.mid * 1.6 + this.energy.amplitude * 0.8;
      ctx.fillStyle = `rgba(185, 244, 255, ${clamp(node.coreAlpha + this.energy.bass * 0.06, 0.2, 0.76)})`;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = `rgba(18, 60, 110, ${0.38 + node.coreAlpha * 0.15})`;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 0.42, 0, Math.PI * 2);
      ctx.fill();

      if (node.spark > 0.16) {
        this.drawTrebleAccent(ctx, node, timestamp);
      }
    }

    ctx.restore();
  }

  drawTrebleAccent(ctx, node, timestamp) {
    const arcRadius = node.radius * (1.28 + node.spark * 0.36);
    const arcStart = timestamp * 0.003 + node.phase;
    const arcSweep = Math.PI * (0.26 + node.spark * 0.42);
    const arcEnd = arcStart + arcSweep;

    ctx.strokeStyle = `rgba(210, 245, 255, ${0.08 + node.spark * 0.28})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(node.x, node.y, arcRadius, arcStart, arcEnd);
    ctx.stroke();

    const tipX = node.x + Math.cos(arcEnd) * arcRadius;
    const tipY = node.y + Math.sin(arcEnd) * arcRadius;
    ctx.fillStyle = `rgba(220, 252, 255, ${0.12 + node.spark * 0.3})`;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 0.7 + node.spark * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
}
