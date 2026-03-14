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

function distanceSquared(a, b) {
  const dx = toNumber(a?.x) - toNumber(b?.x);
  const dy = toNumber(a?.y) - toNumber(b?.y);
  return dx * dx + dy * dy;
}

function createDefaultLayout() {
  const layout = [
    {
      x: 0.5,
      y: 0.44,
      weight: 1.55,
      drift: 0.45,
      phase: 0.08,
      accent: true,
      anchor: true,
      depth: 1.08,
    },
  ];

  const innerCount = 8;
  for (let index = 0; index < innerCount; index += 1) {
    const angle = (index / innerCount) * Math.PI * 2 - Math.PI * 0.5;
    const wobble = Math.sin((index + 1) * 1.37) * 0.012;
    layout.push({
      x: 0.5 + Math.cos(angle) * (0.155 + wobble * 0.5),
      y: 0.44 + Math.sin(angle) * (0.118 + wobble),
      weight: 1.02 + (index % 2 === 0 ? 0.08 : -0.04),
      drift: 0.82 + (index % 3) * 0.12,
      phase: 0.4 + index * 0.68,
      accent: index % 2 === 0,
      depth: 0.98 + (index % 3) * 0.05,
    });
  }

  const outerCount = 12;
  for (let index = 0; index < outerCount; index += 1) {
    const angle = (index / outerCount) * Math.PI * 2 - Math.PI * 0.45;
    const radiusX = 0.294 + Math.sin(index * 0.9) * 0.018;
    const radiusY = 0.212 + Math.cos(index * 0.85) * 0.016;
    layout.push({
      x: 0.5 + Math.cos(angle) * radiusX,
      y: 0.44 + Math.sin(angle) * radiusY,
      weight: 0.84 + ((index + 1) % 4) * 0.07,
      drift: 1 + (index % 4) * 0.14,
      phase: 0.9 + index * 0.54,
      accent: index % 4 === 0,
      depth: 0.74 + (index % 5) * 0.06,
    });
  }

  const veilCount = 6;
  for (let index = 0; index < veilCount; index += 1) {
    const factor = veilCount <= 1 ? 0 : index / (veilCount - 1);
    layout.push({
      x: 0.24 + factor * 0.52 + Math.sin(index * 1.4) * 0.014,
      y: 0.66 + Math.sin(index * 0.8) * 0.025,
      weight: 0.76 + (index % 3) * 0.08,
      drift: 1.12 + (index % 2) * 0.18,
      phase: 0.5 + index * 0.74,
      accent: index === 0 || index === veilCount - 1,
      depth: 0.66 + index * 0.04,
    });
  }

  return layout;
}

const DEFAULT_LAYOUT = Object.freeze(createDefaultLayout());

function createNodeRuntime(node, index, nodeRadius) {
  const seed = (Math.sin((index + 1) * 2.17) + 1) * 0.5;
  const depth = clamp(toNumber(node.depth) || (0.72 + seed * 0.52), 0.55, 1.28);

  return {
    nx: clamp(toNumber(node.x), 0.08, 0.92),
    ny: clamp(toNumber(node.y), 0.12, 0.88),
    weight: clamp(toNumber(node.weight) || 1, 0.55, 1.9),
    drift: clamp(toNumber(node.drift) || 1, 0.3, 1.9),
    phase: toNumber(node.phase) || index * 0.75,
    accent: Boolean(node.accent),
    anchor: Boolean(node.anchor),
    depth,
    motionX: 0.7 + seed * 0.9,
    motionY: 0.7 + (1 - seed) * 0.9,
    flowJitter: 0.00054 + seed * 0.00036,
    orbitRadius: 2.2 + seed * 7.8,
    orbitSpeed: 0.00022 + (1 - seed) * 0.00024,
    pulseSpeed: 0.0024 + seed * 0.0018,
    x: 0,
    y: 0,
    radius: nodeRadius * depth,
    coreAlpha: 0.3,
    spark: 0,
  };
}

function normalizeLayout(layout) {
  if (!Array.isArray(layout) || layout.length < 10) {
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

function buildAdaptiveConnections(layout) {
  const nodeCount = layout.length;
  const uniquePairs = new Set();
  const connections = [];

  const addConnection = (from, to, weight) => {
    if (from < 0 || to < 0 || from >= nodeCount || to >= nodeCount || from === to) {
      return;
    }

    const key = from < to ? `${from}-${to}` : `${to}-${from}`;
    if (uniquePairs.has(key)) {
      return;
    }

    uniquePairs.add(key);
    connections.push({ from, to, weight: clamp(weight, 0.45, 1.35) });
  };

  for (let index = 0; index < nodeCount; index += 1) {
    const distances = [];

    for (let candidate = 0; candidate < nodeCount; candidate += 1) {
      if (candidate === index) {
        continue;
      }

      distances.push({
        to: candidate,
        distance: Math.sqrt(distanceSquared(layout[index], layout[candidate])),
      });
    }

    distances.sort((left, right) => left.distance - right.distance);

    const nearestCount = index === 0 ? Math.min(10, nodeCount - 1) : Math.min(3, nodeCount - 1);
    for (let nearest = 0; nearest < nearestCount; nearest += 1) {
      const entry = distances[nearest];
      if (!entry) {
        continue;
      }

      const weight = 1.28 - entry.distance * 2.4;
      addConnection(index, entry.to, weight);
    }

    if (index > 0 && nodeCount > 6 && index % 2 === 0) {
      const echo = ((index + Math.ceil(nodeCount / 3)) % (nodeCount - 1)) + 1;
      const distance = Math.sqrt(distanceSquared(layout[index], layout[echo]));
      addConnection(index, echo, 1.05 - distance * 1.9);
    }
  }

  return connections.map((connection, index) => ({
    ...connection,
    phase: index * 0.71 + 0.37,
    pulseSpeed: 0.00035 + (index % 5) * 0.00008,
    index,
  }));
}

function normalizeConnections(connections, layout) {
  const nodeCount = layout.length;
  const uniquePairs = new Set();
  const parsedConnections = [];

  if (Array.isArray(connections) && connections.length > 0) {
    for (let index = 0; index < connections.length; index += 1) {
      const parsed = parseConnection(connections[index]);
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
      parsedConnections.push({
        from,
        to,
        weight: clamp(toNumber(parsed.weight) || 0.8, 0.45, 1.35),
        phase: index * 0.71 + 0.37,
        pulseSpeed: 0.00035 + (index % 5) * 0.00008,
        index: parsedConnections.length,
      });
    }
  }

  if (parsedConnections.length > 0) {
    return parsedConnections;
  }

  return buildAdaptiveConnections(layout);
}

function quadraticPointAt(t, x1, y1, cx, cy, x2, y2) {
  const oneMinusT = 1 - t;
  const px = oneMinusT * oneMinusT * x1 + 2 * oneMinusT * t * cx + t * t * x2;
  const py = oneMinusT * oneMinusT * y1 + 2 * oneMinusT * t * cy + t * t * y2;
  return { x: px, y: py };
}

export class NodeNetwork {
  constructor({ layout = DEFAULT_LAYOUT, connections = null, nodeRadius = 5.4 } = {}) {
    const safeLayout = normalizeLayout(layout);
    const safeRadius = clamp(toNumber(nodeRadius) || 5.4, 3.2, 11.5);

    this.nodeRadius = safeRadius;
    this.nodes = safeLayout.map((node, index) => createNodeRuntime(node, index, safeRadius));
    this.connections = normalizeConnections(connections, safeLayout);
    this.energy = {
      bass: 0.1,
      mid: 0.12,
      treble: 0.08,
      amplitude: 0.1,
      flow: 0.18,
    };
    this.visibility = 0.24;
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

    const analysis = normalizeAnalysis(normalizedAnalysis);
    this.updateEnergy(analysis, timestamp, isPlaying);
    this.updateNodes(width, height, timestamp, isPlaying, coreAnchor);
    this.drawConnections(ctx, timestamp, isPlaying);
    this.drawNodes(ctx, timestamp);
  }

  updateEnergy(analysis, timestamp, isPlaying) {
    const idleBreath = 0.08 + Math.sin(timestamp * 0.00064) * 0.028;
    const targets = isPlaying
      ? analysis
      : {
          bass: idleBreath * 0.62,
          mid: idleBreath * 0.76,
          treble: 0.04 + Math.sin(timestamp * 0.0009 + 1.2) * 0.018,
          amplitude: 0.05 + Math.sin(timestamp * 0.00054 + 0.7) * 0.02,
        };
    const smoothing = isPlaying ? 0.16 : 0.045;

    this.energy.bass = lerp(this.energy.bass, targets.bass, smoothing);
    this.energy.mid = lerp(this.energy.mid, targets.mid, smoothing);
    this.energy.treble = lerp(this.energy.treble, targets.treble, smoothing);
    this.energy.amplitude = lerp(this.energy.amplitude, targets.amplitude, smoothing * 0.9);

    const targetFlow = clamp(
      0.2 + targets.mid * 0.58 + targets.treble * 0.28 + (isPlaying ? targets.amplitude * 0.18 : 0),
      0.12,
      1,
    );
    this.energy.flow = lerp(this.energy.flow, targetFlow, isPlaying ? 0.14 : 0.05);

    const targetVisibility = clamp(
      0.17 + this.energy.mid * 0.42 + this.energy.bass * 0.18 + this.energy.amplitude * 0.1,
      0.14,
      0.78,
    );
    this.visibility = lerp(this.visibility, targetVisibility, isPlaying ? 0.14 : 0.05);
  }

  updateNodes(width, height, timestamp, isPlaying, coreAnchor) {
    const motionScale = Math.min(width, height) / 190;
    const centerX = Number.isFinite(coreAnchor?.x) ? coreAnchor.x : width * 0.5;
    const centerY = Number.isFinite(coreAnchor?.y) ? coreAnchor.y : height * 0.44;
    const shiftX = centerX - width * 0.5;
    const shiftY = centerY - height * 0.44;

    for (const node of this.nodes) {
      const baseX = node.nx * width + shiftX * (0.44 + node.depth * 0.54);
      const baseY = node.ny * height + shiftY * (0.44 + node.depth * 0.46);
      const orbitalGain = (isPlaying ? 1.05 : 0.72) + this.energy.flow * 0.55;
      const orbitAngle = timestamp * node.orbitSpeed * (isPlaying ? 1.2 : 0.72) + node.phase;
      const orbitX =
        Math.cos(orbitAngle)
        * node.orbitRadius
        * motionScale
        * orbitalGain
        * (0.8 + node.motionX * 0.4);
      const orbitY =
        Math.sin(orbitAngle * 1.18 + node.phase * 0.5)
        * node.orbitRadius
        * motionScale
        * (0.56 + this.energy.mid * 0.4)
        * (0.82 + node.motionY * 0.3);
      const flowX =
        Math.sin(timestamp * node.flowJitter + node.phase * 1.9)
        * node.drift
        * motionScale
        * (0.68 + this.energy.mid * 1.1);
      const flowY =
        Math.cos(timestamp * (node.flowJitter * 0.86) + node.phase * 1.3)
        * node.drift
        * motionScale
        * (0.58 + this.energy.mid * 0.92);

      const freeX = baseX + orbitX + flowX;
      const freeY = baseY + orbitY + flowY;

      if (node.anchor) {
        const anchorPull = clamp(0.72 + this.energy.mid * 0.12, 0.72, 0.9);
        const anchorX = centerX + Math.cos(orbitAngle * 1.5) * motionScale * 1.8;
        const anchorY = centerY + Math.sin(orbitAngle * 1.35) * motionScale * 1.4;
        node.x = lerp(freeX, anchorX, anchorPull);
        node.y = lerp(freeY, anchorY, anchorPull);
      } else {
        node.x = freeX;
        node.y = freeY;
      }

      const pulseWave = 0.5 + 0.5 * Math.sin(timestamp * node.pulseSpeed + node.phase * 2.4);
      const bassMass = this.energy.bass * (0.34 + node.weight * 0.48);
      const midBreath = pulseWave * (0.08 + this.energy.mid * 0.08);
      const ampEnvelope = this.energy.amplitude * 0.08;
      node.radius = this.nodeRadius * node.weight * node.depth * (1 + bassMass + midBreath + ampEnvelope);
      node.coreAlpha = clamp(0.14 + this.visibility * 0.5 + this.energy.mid * 0.12 + pulseWave * 0.06, 0.12, 0.9);
      node.spark = node.accent
        ? clamp((this.energy.treble - 0.2) * (0.32 + pulseWave * 0.68), 0, 0.78)
        : 0;
    }
  }

  drawConnections(ctx, timestamp, isPlaying) {
    const lineBase = 0.03 + this.energy.mid * 0.34 + this.energy.bass * 0.07 + this.energy.amplitude * 0.08;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = `rgba(102, 225, 255, ${0.03 + this.energy.mid * 0.1 + this.energy.flow * 0.04})`;
    ctx.shadowBlur = 1.6 + this.energy.mid * 4.4 + this.energy.flow * 2;

    for (const connection of this.connections) {
      const from = this.nodes[connection.from];
      const to = this.nodes[connection.to];
      if (!from || !to) {
        continue;
      }

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 1) {
        continue;
      }

      const normalX = -dy / distance;
      const normalY = dx / distance;
      const wave = 0.5 + 0.5 * Math.sin(timestamp * 0.0008 + connection.phase);
      let curvature =
        distance
        * (0.045 + connection.weight * 0.08)
        * (0.66 + wave * 0.55 + this.energy.mid * 0.28);

      if (connection.index % 2 === 0) {
        curvature *= -1;
      }

      const controlX = (from.x + to.x) * 0.5 + normalX * curvature;
      const controlY = (from.y + to.y) * 0.5 + normalY * curvature;
      const alpha = clamp((lineBase * connection.weight * (0.82 + wave * 0.24)) * this.visibility, 0.015, 0.46);
      const width = 0.42 + connection.weight * 0.74 + this.energy.mid * 0.58;

      ctx.strokeStyle = `rgba(32, 118, 204, ${alpha * 0.36})`;
      ctx.lineWidth = width + 1.15;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(controlX, controlY, to.x, to.y);
      ctx.stroke();

      ctx.strokeStyle = `rgba(156, 236, 255, ${alpha * 0.9})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(controlX, controlY, to.x, to.y);
      ctx.stroke();

      if (isPlaying && (connection.index % 4 === 0 || this.energy.treble > 0.62)) {
        const travel = (timestamp * connection.pulseSpeed + connection.phase * 0.1) % 1;
        const pulse = quadraticPointAt(travel, from.x, from.y, controlX, controlY, to.x, to.y);
        const glow = 0.08 + this.energy.treble * 0.18;
        const radius = 0.6 + this.energy.treble * 1.3;

        ctx.fillStyle = `rgba(220, 249, 255, ${glow})`;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawNodes(ctx, timestamp) {
    ctx.save();

    for (const node of this.nodes) {
      const haloRadius = node.radius * (1.76 + this.energy.mid * 0.62 + this.energy.amplitude * 0.24);
      const halo = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, haloRadius);
      halo.addColorStop(0, `rgba(104, 233, 255, ${clamp(node.coreAlpha * 0.24 + this.energy.mid * 0.05, 0.03, 0.32)})`);
      halo.addColorStop(0.62, `rgba(58, 166, 236, ${clamp(node.coreAlpha * 0.11 + this.energy.mid * 0.03, 0.015, 0.16)})`);
      halo.addColorStop(1, "rgba(18, 58, 124, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(node.x, node.y, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      const core = ctx.createRadialGradient(
        node.x - node.radius * 0.22,
        node.y - node.radius * 0.2,
        node.radius * 0.12,
        node.x,
        node.y,
        node.radius * 1.12,
      );
      core.addColorStop(0, `rgba(230, 251, 255, ${clamp(node.coreAlpha * 0.85 + this.energy.bass * 0.08, 0.24, 0.92)})`);
      core.addColorStop(0.55, `rgba(118, 220, 255, ${clamp(node.coreAlpha * 0.44 + this.energy.mid * 0.08, 0.16, 0.66)})`);
      core.addColorStop(1, "rgba(34, 116, 196, 0)");

      ctx.shadowColor = `rgba(126, 230, 255, ${0.05 + node.coreAlpha * 0.2})`;
      ctx.shadowBlur = 1.8 + node.radius * 0.8 + this.energy.mid * 2.2;
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 1.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = `rgba(8, 38, 84, ${0.32 + node.coreAlpha * 0.16})`;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 0.38, 0, Math.PI * 2);
      ctx.fill();

      if (node.spark > 0.16) {
        this.drawTrebleAccent(ctx, node, timestamp);
      }
    }

    ctx.restore();
  }

  drawTrebleAccent(ctx, node, timestamp) {
    const arcRadius = node.radius * (1.35 + node.spark * 0.42);
    const arcStart = timestamp * 0.0036 + node.phase;
    const arcSweep = Math.PI * (0.22 + node.spark * 0.44);

    ctx.strokeStyle = `rgba(220, 248, 255, ${0.09 + node.spark * 0.3})`;
    ctx.lineWidth = 0.9 + node.spark * 0.5;
    ctx.beginPath();
    ctx.arc(node.x, node.y, arcRadius, arcStart, arcStart + arcSweep);
    ctx.stroke();

    ctx.strokeStyle = `rgba(140, 230, 255, ${0.07 + node.spark * 0.2})`;
    ctx.lineWidth = 0.72;
    ctx.beginPath();
    ctx.arc(node.x, node.y, arcRadius * 0.9, arcStart + Math.PI, arcStart + Math.PI + arcSweep * 0.8);
    ctx.stroke();

    const tipAngle = arcStart + arcSweep;
    const tipX = node.x + Math.cos(tipAngle) * arcRadius;
    const tipY = node.y + Math.sin(tipAngle) * arcRadius;
    ctx.fillStyle = `rgba(236, 252, 255, ${0.16 + node.spark * 0.3})`;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 0.68 + node.spark * 0.85, 0, Math.PI * 2);
    ctx.fill();
  }
}
