const ZERO_NORMALIZED = Object.freeze({
  bass: 0,
  mid: 0,
  treble: 0,
  amplitude: 0,
});

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

function createDefaultLayout() {
  const layout = [
    {
      x: 0.5,
      y: 0.44,
      weight: 1.5,
      drift: 0.3,
      phase: 0.1,
      accent: true,
      anchor: true,
      depth: 1.1,
    },
  ];

  const innerCount = 5;
  for (let index = 0; index < innerCount; index += 1) {
    const angle = (index / innerCount) * Math.PI * 2 - Math.PI * 0.5;
    layout.push({
      x: 0.5 + Math.cos(angle) * 0.15,
      y: 0.44 + Math.sin(angle) * 0.11,
      weight: 1 + (index % 2 === 0 ? 0.06 : -0.04),
      drift: 0.7 + (index % 3) * 0.12,
      phase: 0.4 + index * 0.72,
      accent: index % 2 === 0,
      depth: 0.96 + (index % 3) * 0.05,
    });
  }

  const outerCount = 7;
  for (let index = 0; index < outerCount; index += 1) {
    const angle = (index / outerCount) * Math.PI * 2 - Math.PI * 0.42;
    layout.push({
      x: 0.5 + Math.cos(angle) * (0.27 + Math.sin(index * 1.1) * 0.015),
      y: 0.44 + Math.sin(angle) * (0.2 + Math.cos(index * 0.9) * 0.012),
      weight: 0.82 + (index % 3) * 0.08,
      drift: 0.86 + (index % 2) * 0.16,
      phase: 0.88 + index * 0.62,
      accent: index % 3 === 0,
      depth: 0.74 + (index % 4) * 0.06,
    });
  }

  return layout;
}

const DEFAULT_LAYOUT = Object.freeze(createDefaultLayout());

function normalizeLayout(layout) {
  if (!Array.isArray(layout) || layout.length < 8) {
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

function createDefaultConnections(layout) {
  const nodeCount = layout.length;
  const innerCount = Math.min(5, Math.max(0, nodeCount - 1));
  const outerStart = 1 + innerCount;
  const outerCount = Math.max(0, nodeCount - outerStart);
  const uniquePairs = new Set();
  const connections = [];

  const add = (from, to, weight) => {
    if (from < 0 || to < 0 || from >= nodeCount || to >= nodeCount || from === to) {
      return;
    }

    const key = from < to ? `${from}-${to}` : `${to}-${from}`;
    if (uniquePairs.has(key)) {
      return;
    }

    uniquePairs.add(key);
    connections.push({ from, to, weight: clamp(weight, 0.45, 1.25) });
  };

  for (let inner = 0; inner < innerCount; inner += 1) {
    const index = 1 + inner;
    const nextIndex = 1 + ((inner + 1) % innerCount);

    add(0, index, 1.08);
    add(index, nextIndex, 0.82);

    if (outerCount > 0) {
      const outerIndex = outerStart + (inner % outerCount);
      add(index, outerIndex, 0.74);
    }
  }

  for (let outer = 0; outer < outerCount; outer += 1) {
    const index = outerStart + outer;

    if (outer % 2 === 0) {
      add(0, index, 0.64);
    }

    if (outer % 3 === 0 && outerCount > 1) {
      const nextOuter = outerStart + ((outer + 1) % outerCount);
      add(index, nextOuter, 0.62);
    }
  }

  return connections.map((connection, index) => ({
    ...connection,
    phase: index * 0.8 + 0.28,
    pulseSpeed: 0.00028 + (index % 4) * 0.00007,
    bend: (index % 2 === 0 ? 1 : -1) * (0.2 + (index % 3) * 0.12),
    index,
  }));
}

function normalizeConnections(connections, layout) {
  const nodeCount = layout.length;

  if (Array.isArray(connections) && connections.length > 0) {
    const parsed = [];
    const uniquePairs = new Set();

    for (let index = 0; index < connections.length; index += 1) {
      const connection = parseConnection(connections[index]);
      if (!connection) {
        continue;
      }

      const from = Math.floor(toNumber(connection.from));
      const to = Math.floor(toNumber(connection.to));

      if (from < 0 || to < 0 || from >= nodeCount || to >= nodeCount || from === to) {
        continue;
      }

      const key = from < to ? `${from}-${to}` : `${to}-${from}`;
      if (uniquePairs.has(key)) {
        continue;
      }

      uniquePairs.add(key);
      parsed.push({
        from,
        to,
        weight: clamp(toNumber(connection.weight) || 0.8, 0.45, 1.25),
        phase: index * 0.8 + 0.28,
        pulseSpeed: 0.00028 + (index % 4) * 0.00007,
        bend: (index % 2 === 0 ? 1 : -1) * (0.2 + (index % 3) * 0.12),
        index: parsed.length,
      });
    }

    if (parsed.length > 0) {
      return parsed;
    }
  }

  return createDefaultConnections(layout);
}

function quadraticPointAt(t, x1, y1, cx, cy, x2, y2) {
  const oneMinusT = 1 - t;
  return {
    x: oneMinusT * oneMinusT * x1 + 2 * oneMinusT * t * cx + t * t * x2,
    y: oneMinusT * oneMinusT * y1 + 2 * oneMinusT * t * cy + t * t * y2,
  };
}

export class NodeNetwork {
  constructor({ layout = DEFAULT_LAYOUT, connections = null, nodeRadius = 5.4 } = {}) {
    const safeLayout = normalizeLayout(layout);
    const safeRadius = clamp(toNumber(nodeRadius) || 5.4, 3.2, 11);

    this.nodeRadius = safeRadius;
    this.nodes = safeLayout.map((node, index) => {
      const seed = (Math.sin((index + 1) * 2.11) + 1) * 0.5;

      return {
        nx: clamp(toNumber(node.x), 0.08, 0.92),
        ny: clamp(toNumber(node.y), 0.12, 0.86),
        weight: clamp(toNumber(node.weight) || 1, 0.55, 1.8),
        drift: clamp(toNumber(node.drift) || 1, 0.2, 1.6),
        phase: toNumber(node.phase) || index * 0.8,
        accent: Boolean(node.accent),
        anchor: Boolean(node.anchor),
        depth: clamp(toNumber(node.depth) || (0.72 + seed * 0.48), 0.58, 1.25),
        swayX: 0.6 + seed * 0.8,
        swayY: 0.6 + (1 - seed) * 0.8,
        swaySpeedX: 0.00034 + seed * 0.0002,
        swaySpeedY: 0.00028 + (1 - seed) * 0.0002,
        orbitRadius: 1.6 + seed * 5,
        orbitSpeed: 0.00018 + (1 - seed) * 0.00014,
        pulseSpeed: 0.002 + seed * 0.0014,
        x: 0,
        y: 0,
        radius: safeRadius,
        alpha: 0.24,
        spark: 0,
      };
    });

    this.connections = normalizeConnections(connections, safeLayout);
    this.energy = {
      bass: 0.1,
      mid: 0.12,
      treble: 0.08,
      amplitude: 0.1,
      flow: 0.16,
    };
    this.visibility = 0.24;
    this.coreAnchor = { x: 0, y: 0 };
  }

  render(
    ctx,
    {
      width = 0,
      height = 0,
      timestamp = 0,
      normalizedAnalysis = ZERO_NORMALIZED,
      isPlaying = false,
      coreAnchor = null,
    } = {},
  ) {
    if (!ctx || width <= 0 || height <= 0 || this.nodes.length === 0) {
      return;
    }

    this.coreAnchor = {
      x: Number.isFinite(coreAnchor?.x) ? coreAnchor.x : width * 0.5,
      y: Number.isFinite(coreAnchor?.y) ? coreAnchor.y : height * 0.44,
    };

    const analysis = normalizeAnalysis(normalizedAnalysis);
    this.updateEnergy(analysis, timestamp, isPlaying);
    this.updateNodes(width, height, timestamp, isPlaying);
    this.drawConnections(ctx, timestamp, isPlaying);
    this.drawNodes(ctx, timestamp);
  }

  updateEnergy(analysis, timestamp, isPlaying) {
    const idleBreath = 0.08 + Math.sin(timestamp * 0.00058) * 0.022;
    const targets = isPlaying
      ? analysis
      : {
          bass: idleBreath * 0.6,
          mid: idleBreath * 0.76,
          treble: 0.04 + Math.sin(timestamp * 0.00086 + 1.1) * 0.018,
          amplitude: 0.05 + Math.sin(timestamp * 0.0005 + 0.6) * 0.016,
        };
    const smoothing = isPlaying ? 0.14 : 0.045;

    this.energy.bass = lerp(this.energy.bass, targets.bass, smoothing);
    this.energy.mid = lerp(this.energy.mid, targets.mid, smoothing);
    this.energy.treble = lerp(this.energy.treble, targets.treble, smoothing);
    this.energy.amplitude = lerp(this.energy.amplitude, targets.amplitude, smoothing * 0.85);

    const flowTarget = clamp(0.2 + targets.mid * 0.55 + targets.treble * 0.16, 0.12, 0.94);
    this.energy.flow = lerp(this.energy.flow, flowTarget, isPlaying ? 0.12 : 0.05);

    const visibilityTarget = clamp(
      0.16 + this.energy.mid * 0.36 + this.energy.bass * 0.14 + this.energy.amplitude * 0.08,
      0.13,
      0.7,
    );
    this.visibility = lerp(this.visibility, visibilityTarget, isPlaying ? 0.12 : 0.05);
  }

  updateNodes(width, height, timestamp, isPlaying) {
    const motionScale = Math.min(width, height) / 210;
    const centerX = this.coreAnchor.x;
    const centerY = this.coreAnchor.y;
    const shiftX = centerX - width * 0.5;
    const shiftY = centerY - height * 0.44;

    for (const node of this.nodes) {
      const baseX = node.nx * width + shiftX * (0.44 + node.depth * 0.54);
      const baseY = node.ny * height + shiftY * (0.44 + node.depth * 0.48);
      const swayGain = (isPlaying ? 0.9 : 0.56) + this.energy.flow * 0.45;
      const swayX =
        Math.sin(timestamp * node.swaySpeedX + node.phase * 1.4)
        * node.drift
        * node.swayX
        * motionScale
        * swayGain;
      const swayY =
        Math.cos(timestamp * node.swaySpeedY + node.phase)
        * node.drift
        * node.swayY
        * motionScale
        * (0.68 + this.energy.flow * 0.36);
      const orbitAngle = timestamp * node.orbitSpeed * (isPlaying ? 1 : 0.7) + node.phase;
      const orbitX = Math.cos(orbitAngle) * node.orbitRadius * motionScale * (0.5 + this.energy.mid * 0.26);
      const orbitY =
        Math.sin(orbitAngle * 1.1)
        * node.orbitRadius
        * motionScale
        * (0.36 + this.energy.mid * 0.22);

      let nextX = baseX + swayX + orbitX;
      let nextY = baseY + swayY + orbitY;

      if (node.anchor) {
        nextX = lerp(nextX, centerX, 0.82);
        nextY = lerp(nextY, centerY, 0.82);
      }

      node.x = nextX;
      node.y = nextY;

      const pulse = 0.5 + 0.5 * Math.sin(timestamp * node.pulseSpeed + node.phase * 2.2);
      const bassMass = this.energy.bass * (0.24 + node.weight * 0.34);
      const breath = pulse * (0.05 + this.energy.mid * 0.07);
      const envelope = this.energy.amplitude * 0.05;
      node.radius = this.nodeRadius * node.weight * node.depth * (1 + bassMass + breath + envelope);
      node.alpha = clamp(0.1 + this.visibility * 0.46 + pulse * 0.05, 0.1, 0.82);
      node.spark = node.accent
        ? clamp((this.energy.treble - 0.24) * (0.3 + pulse * 0.55), 0, 0.64)
        : 0;
    }
  }

  drawConnections(ctx, timestamp, isPlaying) {
    const lineBase = 0.025 + this.energy.mid * 0.24 + this.energy.bass * 0.05 + this.energy.amplitude * 0.04;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const connection of this.connections) {
      const from = this.nodes[connection.from];
      const to = this.nodes[connection.to];

      if (!from || !to) {
        continue;
      }

      const midX = (from.x + to.x) * 0.5;
      const midY = (from.y + to.y) * 0.5;
      const towardCoreX = this.coreAnchor.x - midX;
      const towardCoreY = this.coreAnchor.y - midY;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 1) {
        continue;
      }

      const normalX = -dy / distance;
      const normalY = dx / distance;
      const bend = distance * (0.04 + connection.bend * 0.05) * (0.54 + this.energy.flow * 0.34);
      const controlX = midX + normalX * bend + towardCoreX * 0.2;
      const controlY = midY + normalY * bend + towardCoreY * 0.2;
      const breath = 0.84 + 0.16 * Math.sin(timestamp * 0.0008 + connection.phase);
      const alpha = clamp(lineBase * connection.weight * breath * this.visibility, 0.012, 0.28);

      ctx.strokeStyle = `rgba(90, 194, 242, ${alpha})`;
      ctx.lineWidth = 0.9 + connection.weight * 0.7 + this.energy.flow * 0.28;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(controlX, controlY, to.x, to.y);
      ctx.stroke();

      if (connection.index % 5 === 0) {
        ctx.strokeStyle = `rgba(140, 150, 252, ${alpha * 0.35})`;
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(controlX, controlY, to.x, to.y);
        ctx.stroke();
      }

      if (isPlaying && this.energy.treble > 0.5 && connection.index % 6 === 0) {
        const travel = (timestamp * connection.pulseSpeed + connection.phase * 0.1) % 1;
        const pulse = quadraticPointAt(travel, from.x, from.y, controlX, controlY, to.x, to.y);
        ctx.fillStyle = `rgba(226, 248, 255, ${0.08 + this.energy.treble * 0.16})`;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, 0.6 + this.energy.treble * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawNodes(ctx, timestamp) {
    ctx.save();

    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index];
      const shouldDraw = node.anchor || node.accent || index % 3 === 0;

      if (!shouldDraw) {
        continue;
      }

      const haloRadius = node.radius * (1.4 + this.energy.mid * 0.38);
      const halo = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, haloRadius);
      halo.addColorStop(0, `rgba(112, 230, 255, ${clamp(node.alpha * 0.2 + this.energy.mid * 0.03, 0.025, 0.2)})`);
      halo.addColorStop(1, "rgba(28, 100, 174, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(node.x, node.y, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(188, 244, 255, ${clamp(node.alpha * 0.7 + this.energy.bass * 0.04, 0.14, 0.72)})`;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 0.78, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(34, 88, 154, ${0.3 + node.alpha * 0.18})`;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 0.28, 0, Math.PI * 2);
      ctx.fill();

      if (node.spark > 0.14) {
        const angle = timestamp * 0.0022 + node.phase;
        const sparkX = node.x + Math.cos(angle) * node.radius * 1.2;
        const sparkY = node.y + Math.sin(angle) * node.radius * 1.2;
        ctx.fillStyle = `rgba(236, 251, 255, ${0.1 + node.spark * 0.25})`;
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 0.5 + node.spark * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
