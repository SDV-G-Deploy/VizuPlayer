import { NodeNetwork } from "./nodeNetwork.js";

const ZERO_ANALYSIS = Object.freeze({
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
    bass: clamp(toNumber(analysis.bass) / 255, 0, 1),
    mid: clamp(toNumber(analysis.mid) / 255, 0, 1),
    treble: clamp(toNumber(analysis.treble) / 255, 0, 1),
    amplitude: clamp(toNumber(analysis.amplitude) / 100, 0, 1),
  };
}

function wrapUnit(value) {
  const wrapped = value % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

function createDustField(
  count,
  {
    radiusMin = 0.35,
    radiusMax = 1.8,
    alphaMin = 0.03,
    alphaMax = 0.26,
    driftMin = 0.0006,
    driftMax = 0.003,
    speedMin = 0.00007,
    speedMax = 0.00028,
  } = {},
) {
  const field = [];

  for (let index = 0; index < count; index += 1) {
    field.push({
      x: Math.random(),
      y: Math.random(),
      radius: radiusMin + Math.random() * (radiusMax - radiusMin),
      alpha: alphaMin + Math.random() * (alphaMax - alphaMin),
      twinkle: 0.6 + Math.random() * 1.4,
      speed: speedMin + Math.random() * (speedMax - speedMin),
      driftX: driftMin + Math.random() * (driftMax - driftMin),
      driftY: driftMin + Math.random() * (driftMax - driftMin),
      phase: Math.random() * Math.PI * 2,
      tone: Math.random(),
      depth: 0.48 + Math.random() * 0.9,
    });
  }

  return field;
}

export class Visualizer {
  constructor({ canvas, barCount = 64, network = {} }) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Visualizer requires a valid <canvas> element.");
    }

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to get 2D canvas context.");
    }

    this.canvas = canvas;
    this.ctx = context;
    this.barCount = Math.max(24, Math.floor(barCount));
    this.mappedSpectrum = new Float32Array(this.barCount);
    this.smoothBars = new Float32Array(this.barCount);
    this.deepDust = createDustField(96, {
      radiusMin: 0.25,
      radiusMax: 1.15,
      alphaMin: 0.018,
      alphaMax: 0.11,
      driftMin: 0.0004,
      driftMax: 0.0018,
      speedMin: 0.00004,
      speedMax: 0.00015,
    });
    this.midDust = createDustField(56, {
      radiusMin: 0.45,
      radiusMax: 1.9,
      alphaMin: 0.035,
      alphaMax: 0.2,
      driftMin: 0.0007,
      driftMax: 0.0028,
      speedMin: 0.00008,
      speedMax: 0.00026,
    });
    this.foregroundShards = createDustField(24, {
      radiusMin: 0.8,
      radiusMax: 2.2,
      alphaMin: 0.05,
      alphaMax: 0.3,
      driftMin: 0.0008,
      driftMax: 0.0032,
      speedMin: 0.0001,
      speedMax: 0.00034,
    });
    this.nodeNetwork = new NodeNetwork(network);
    this.analysis = { ...ZERO_ANALYSIS };
    this.normalized = normalizeAnalysis(ZERO_ANALYSIS);
    this.isPlaying = false;
    this.pixelRatio = clamp(window.devicePixelRatio || 1, 1, 2);
    this.width = 0;
    this.height = 0;
    this.handleResize = () => this.resize();

    window.addEventListener("resize", this.handleResize, { passive: true });
    this.resize(true);
  }

  destroy() {
    window.removeEventListener("resize", this.handleResize);
  }

  resize(force = false) {
    const width = Math.max(1, Math.floor(this.canvas.clientWidth || this.canvas.width || 320));
    const height = Math.max(120, Math.floor(this.canvas.clientHeight || this.canvas.height || 180));
    const scaledWidth = Math.floor(width * this.pixelRatio);
    const scaledHeight = Math.floor(height * this.pixelRatio);

    if (!force && scaledWidth === this.canvas.width && scaledHeight === this.canvas.height) {
      return;
    }

    this.canvas.width = scaledWidth;
    this.canvas.height = scaledHeight;
    this.width = width;
    this.height = height;
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }

  setFrameData({ analysis = ZERO_ANALYSIS, spectrumData = null, isPlaying = false } = {}) {
    this.analysis = {
      bass: Math.round(clamp(toNumber(analysis.bass), 0, 255)),
      mid: Math.round(clamp(toNumber(analysis.mid), 0, 255)),
      treble: Math.round(clamp(toNumber(analysis.treble), 0, 255)),
      amplitude: Math.round(clamp(toNumber(analysis.amplitude), 0, 100)),
    };

    this.normalized = normalizeAnalysis(this.analysis);
    this.isPlaying = Boolean(isPlaying);
    this.mapSpectrumData(spectrumData);
  }

  mapSpectrumData(spectrumData) {
    if (!spectrumData || typeof spectrumData.length !== "number" || spectrumData.length === 0) {
      this.mappedSpectrum.fill(0);
      return;
    }

    const sourceLength = spectrumData.length;

    for (let index = 0; index < this.barCount; index += 1) {
      const start = Math.floor((index / this.barCount) * sourceLength);
      const end = Math.max(start + 1, Math.floor(((index + 1) / this.barCount) * sourceLength));
      let sum = 0;
      let count = 0;

      for (let cursor = start; cursor < end; cursor += 1) {
        sum += spectrumData[cursor];
        count += 1;
      }

      this.mappedSpectrum[index] = count > 0 ? (sum / count) / 255 : 0;
    }
  }

  getCoreAnchor(timestamp, structureLevel = 0, envelope = 0) {
    const driftX = Math.sin(timestamp * 0.00019 + structureLevel * 2.4) * this.width * (0.008 + envelope * 0.01);
    const driftY =
      Math.cos(timestamp * 0.00016 + structureLevel * 1.7) * this.height * (0.006 + envelope * 0.008);

    return {
      x: this.width * 0.5 + driftX,
      y: this.height * 0.44 + driftY,
    };
  }

  render(timestamp = 0) {
    this.resize();

    const bass = this.normalized.bass;
    const mid = this.normalized.mid;
    const treble = this.normalized.treble;
    const amplitude = this.normalized.amplitude;
    const envelope = this.isPlaying ? 0.2 + amplitude * 0.4 : 0.08 + amplitude * 0.1;
    const massLevel = clamp((this.isPlaying ? 0.16 : 0.09) + bass * 0.62 + amplitude * 0.08, 0.09, 0.95);
    const structureLevel = clamp((this.isPlaying ? 0.2 : 0.11) + mid * 0.56 + amplitude * 0.08, 0.11, 0.94);
    const sparkleLevel = clamp((this.isPlaying ? 0.08 : 0.04) + treble * 0.67 + amplitude * 0.05, 0.04, 0.98);
    const ambientLevel = clamp(
      (this.isPlaying ? 0.14 : 0.09) + mid * 0.24 + bass * 0.15 + amplitude * 0.09,
      0.09,
      0.75,
    );
    const anchor = this.getCoreAnchor(timestamp, structureLevel, envelope);

    this.drawVoidBackdrop({ ambientLevel, structureLevel, envelope }, anchor);
    this.drawDistantNebula(timestamp, { ambientLevel, structureLevel, massLevel, envelope }, anchor);
    this.drawDustField(timestamp, this.deepDust, { ambientLevel, sparkleLevel, envelope }, anchor, 0.65);
    this.drawDustField(timestamp, this.midDust, { ambientLevel, sparkleLevel, envelope }, anchor, 1);
    this.drawEnergyCurrents(
      timestamp,
      { bass, mid, treble, amplitude },
      { massLevel, structureLevel, sparkleLevel, envelope },
      anchor,
    );
    this.drawNodeNetwork(timestamp, { bass, mid, treble, amplitude }, anchor);
    this.drawSpectrumCorona(
      timestamp,
      { bass, mid, treble, amplitude },
      { massLevel, structureLevel, sparkleLevel, envelope },
      anchor,
    );
    this.drawCosmicCore(
      timestamp,
      { bass, mid, treble, amplitude },
      { massLevel, structureLevel, sparkleLevel, envelope },
      anchor,
    );
    this.drawForegroundShards(timestamp, { structureLevel, sparkleLevel, envelope }, anchor);
    this.drawPanelFrame({ structureLevel, ambientLevel, envelope });
  }

  drawVoidBackdrop({ ambientLevel, structureLevel, envelope }, anchor) {
    const { ctx, width, height } = this;
    const background = ctx.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, `rgba(2, 8, 24, ${0.97 + ambientLevel * 0.02})`);
    background.addColorStop(0.46, `rgba(2, 6, 17, ${0.985 + structureLevel * 0.01})`);
    background.addColorStop(1, "rgba(0, 2, 10, 1)");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const centerLift = ctx.createRadialGradient(anchor.x, anchor.y, height * 0.08, anchor.x, anchor.y, Math.max(width, height) * 0.76);
    centerLift.addColorStop(0, `rgba(16, 44, 98, ${0.1 + ambientLevel * 0.14 + envelope * 0.04})`);
    centerLift.addColorStop(0.56, `rgba(6, 18, 52, ${0.05 + ambientLevel * 0.08 + structureLevel * 0.04})`);
    centerLift.addColorStop(1, "rgba(1, 4, 15, 0)");
    ctx.fillStyle = centerLift;
    ctx.fillRect(0, 0, width, height);

    const vignette = ctx.createRadialGradient(anchor.x, anchor.y, Math.min(width, height) * 0.24, anchor.x, anchor.y, Math.max(width, height) * 0.95);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(0.72, `rgba(0, 0, 0, ${0.2 + ambientLevel * 0.08})`);
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.72)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  drawDistantNebula(timestamp, { ambientLevel, structureLevel, massLevel, envelope }, anchor) {
    const { ctx, width, height } = this;
    const largestSide = Math.max(width, height);
    const lobes = [
      {
        offsetX: -0.24,
        offsetY: -0.18,
        radius: 0.74,
        color: [44, 106, 196],
        alpha: 0.04 + ambientLevel * 0.09 + structureLevel * 0.03,
      },
      {
        offsetX: 0.28,
        offsetY: -0.1,
        radius: 0.64,
        color: [32, 124, 184],
        alpha: 0.032 + ambientLevel * 0.07 + massLevel * 0.03,
      },
      {
        offsetX: 0.06,
        offsetY: 0.22,
        radius: 0.7,
        color: [24, 88, 152],
        alpha: 0.026 + ambientLevel * 0.065 + structureLevel * 0.02,
      },
    ];

    for (let index = 0; index < lobes.length; index += 1) {
      const lobe = lobes[index];
      const driftX = Math.sin(timestamp * (0.00007 + index * 0.000015) + index * 1.4) * width * 0.02;
      const driftY = Math.cos(timestamp * (0.00006 + index * 0.000013) + index * 0.8) * height * 0.017;
      const x = anchor.x + width * lobe.offsetX + driftX;
      const y = anchor.y + height * lobe.offsetY + driftY;
      const radius = largestSide * (lobe.radius + massLevel * 0.07 + envelope * 0.03);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${lobe.color[0]}, ${lobe.color[1]}, ${lobe.color[2]}, ${lobe.alpha})`);
      gradient.addColorStop(0.58, `rgba(${Math.round(lobe.color[0] * 0.62)}, ${Math.round(lobe.color[1] * 0.62)}, ${Math.round(lobe.color[2] * 0.62)}, ${lobe.alpha * 0.48})`);
      gradient.addColorStop(1, "rgba(10, 24, 58, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
  }

  drawDustField(timestamp, field, { ambientLevel, sparkleLevel, envelope }, anchor, layerGain = 1) {
    const { ctx, width, height } = this;
    const anchorShiftX = (anchor.x / width - 0.5) * 0.018 * layerGain;
    const anchorShiftY = (anchor.y / height - 0.44) * 0.022 * layerGain;

    for (const particle of field) {
      const driftTime = timestamp * particle.speed;
      const x =
        wrapUnit(
          particle.x
            + Math.cos(driftTime + particle.phase) * particle.driftX * layerGain
            + anchorShiftX * particle.depth,
        ) * width;
      const y =
        wrapUnit(
          particle.y
            + Math.sin(driftTime * 1.15 + particle.phase * 0.82) * particle.driftY * layerGain
            + anchorShiftY * particle.depth,
        ) * height;
      const twinkle = 0.45 + 0.55 * Math.sin(timestamp * 0.0018 * particle.twinkle + particle.phase);
      const alpha = clamp(
        particle.alpha
          * twinkle
          * (0.32 + ambientLevel * 0.9 + sparkleLevel * 0.32 + envelope * 0.24)
          * (this.isPlaying ? 1 : 0.72),
        0.008,
        0.38,
      );
      const red = 104 + Math.round(particle.tone * 62);
      const green = 176 + Math.round(particle.tone * 58);
      const blue = 246 + Math.round(particle.tone * 9);

      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, particle.radius * particle.depth * layerGain, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawEnergyCurrents(
    timestamp,
    { bass, mid, treble, amplitude },
    { massLevel, structureLevel, sparkleLevel, envelope },
    anchor,
  ) {
    const { ctx, width, height } = this;
    const baseRadius = Math.min(width, height) * (0.19 + massLevel * 0.08);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    for (let index = 0; index < 7; index += 1) {
      const direction = index % 2 === 0 ? 1 : -1;
      const orbit = timestamp * (0.00016 + index * 0.000018) * direction;
      const sweep = Math.PI * (0.38 + structureLevel * 0.28 + (index % 3) * 0.06);
      const start = orbit + index * 0.62;
      const radiusX = baseRadius * (1.32 + index * 0.19 + structureLevel * 0.16);
      const radiusY = radiusX * (0.46 + index * 0.022);
      const glowAlpha = 0.015 + structureLevel * 0.095 + massLevel * 0.04 + envelope * 0.025;

      ctx.shadowColor = `rgba(94, 218, 255, ${0.018 + structureLevel * 0.09 + sparkleLevel * 0.04})`;
      ctx.shadowBlur = 1.6 + structureLevel * 4.8 + envelope * 3;
      ctx.strokeStyle = `rgba(40, 136, 224, ${glowAlpha * (0.75 + index * 0.08)})`;
      ctx.lineWidth = 0.86 + index * 0.12 + structureLevel * 0.8;
      ctx.beginPath();
      ctx.ellipse(anchor.x, anchor.y, radiusX, radiusY, start * 0.32, start, start + sweep);
      ctx.stroke();

      ctx.strokeStyle = `rgba(170, 240, 255, ${0.015 + sparkleLevel * 0.085 + envelope * 0.025 + treble * 0.02})`;
      ctx.lineWidth = 0.72 + structureLevel * 0.62 + bass * 0.18 + mid * 0.1 + amplitude * 0.08;
      ctx.beginPath();
      ctx.ellipse(
        anchor.x,
        anchor.y,
        radiusX * 0.986,
        radiusY * 0.986,
        start * 0.32,
        start + sweep * 0.24,
        start + sweep * 0.6,
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  drawNodeNetwork(timestamp, normalizedAnalysis, anchor) {
    this.nodeNetwork.render(this.ctx, {
      width: this.width,
      height: this.height,
      timestamp,
      normalizedAnalysis,
      isPlaying: this.isPlaying,
      coreAnchor: anchor,
    });
  }

  drawSpectrumCorona(
    timestamp,
    { bass, mid, treble, amplitude },
    { massLevel, structureLevel, sparkleLevel, envelope },
    anchor,
  ) {
    const { ctx, width, height } = this;
    const sweep = Math.PI * 1.88;
    const startAngle = -Math.PI * 0.94 + Math.sin(timestamp * 0.00026) * 0.06;
    const coronaRadius = Math.min(width, height) * (0.26 + massLevel * 0.09);
    const radialScale = Math.min(width, height) * (0.12 + structureLevel * 0.09);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let index = 0; index < this.barCount; index += 1) {
      const zone = index / (this.barCount - 1);
      let zoneGain = 1;

      if (zone < 0.34) {
        zoneGain += bass * 0.9;
      } else if (zone < 0.67) {
        zoneGain += mid * 0.82;
      } else {
        zoneGain += treble * 0.88;
      }

      const shimmer = this.isPlaying
        ? 0.5 + 0.5 * Math.sin(timestamp * 0.018 + index * 0.84 + treble * 2.5)
        : 0.35 + 0.2 * Math.sin(timestamp * 0.003 + index * 0.22);
      const idleWave = this.isPlaying
        ? 0.006
        : 0.0035 + 0.009 * (Math.sin(timestamp * 0.0015 + index * 0.24) * 0.5 + 0.5);
      const trebleFlicker = zone > 0.66 ? treble * shimmer * (0.12 + envelope * 0.07) : 0;
      const target = clamp(this.mappedSpectrum[index] * zoneGain + idleWave + trebleFlicker, 0, 1.08);
      const smoothing = this.isPlaying ? 0.22 + treble * 0.1 : 0.08;

      this.smoothBars[index] = lerp(this.smoothBars[index], target, smoothing);

      const roleLift = zone < 0.34 ? bass : zone < 0.67 ? mid : treble;
      const barLength =
        this.smoothBars[index]
        * radialScale
        * (0.58 + roleLift * 0.32 + amplitude * 0.1 + envelope * 0.12);
      const innerRadius = coronaRadius * (1.08 + structureLevel * 0.14);
      const angleJitter = Math.sin(timestamp * 0.00094 + index * 0.42) * (this.isPlaying ? 0.018 : 0.01);
      const angle = startAngle + zone * sweep + angleJitter;
      const outerRadius = innerRadius + barLength + (2 + roleLift * 4.2);
      const startX = anchor.x + Math.cos(angle) * innerRadius;
      const startY = anchor.y + Math.sin(angle) * innerRadius;
      const endX = anchor.x + Math.cos(angle) * outerRadius;
      const endY = anchor.y + Math.sin(angle) * outerRadius;
      const gradient = ctx.createLinearGradient(startX, startY, endX, endY);

      gradient.addColorStop(0, `rgba(32, 92, 168, ${0.1 + roleLift * 0.09 + envelope * 0.03})`);
      gradient.addColorStop(0.64, `rgba(90, 202, 252, ${0.19 + roleLift * 0.2 + envelope * 0.08})`);
      gradient.addColorStop(1, `rgba(238, 251, 255, ${0.14 + sparkleLevel * 0.24 + roleLift * 0.13})`);

      ctx.shadowColor = `rgba(112, 228, 255, ${0.03 + roleLift * 0.1 + envelope * 0.1})`;
      ctx.shadowBlur = 2 + roleLift * 2.6 + sparkleLevel * 3.2 + envelope * 2.5;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 0.95 + roleLift * 1.1 + envelope * 0.55;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(96, 198, 247, ${0.08 + structureLevel * 0.11 + envelope * 0.05})`;
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, coronaRadius * (1.09 + structureLevel * 0.1), startAngle, startAngle + sweep);
    ctx.stroke();

    ctx.strokeStyle = `rgba(186, 236, 255, ${0.04 + sparkleLevel * 0.12 + envelope * 0.035})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(
      anchor.x,
      anchor.y,
      coronaRadius * (1.18 + structureLevel * 0.12),
      startAngle + sweep * 0.15,
      startAngle + sweep * 0.84,
    );
    ctx.stroke();

    ctx.restore();
  }

  drawCosmicCore(
    timestamp,
    { bass, mid, treble },
    { massLevel, structureLevel, sparkleLevel, envelope },
    anchor,
  ) {
    const { ctx, width, height } = this;
    const pulse = this.isPlaying ? Math.sin(timestamp * 0.0037 + bass * 7.1) : Math.sin(timestamp * 0.0016 + 0.8);
    const coreRadius = Math.min(width, height) * (0.122 + massLevel * 0.13 + envelope * 0.034 + pulse * 0.012);
    const auraRadius = coreRadius * (3.2 + structureLevel * 0.74 + envelope * 0.2);

    const aura = ctx.createRadialGradient(anchor.x, anchor.y, coreRadius * 0.16, anchor.x, anchor.y, auraRadius);
    aura.addColorStop(0, `rgba(74, 210, 255, ${0.1 + structureLevel * 0.16 + sparkleLevel * 0.05})`);
    aura.addColorStop(0.45, `rgba(34, 122, 204, ${0.064 + structureLevel * 0.1 + massLevel * 0.05})`);
    aura.addColorStop(1, "rgba(14, 42, 102, 0)");
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, width, height);

    const body = ctx.createRadialGradient(
      anchor.x - coreRadius * 0.22,
      anchor.y - coreRadius * 0.2,
      coreRadius * 0.08,
      anchor.x,
      anchor.y,
      coreRadius * 1.46,
    );
    body.addColorStop(0, `rgba(232, 251, 255, ${0.18 + sparkleLevel * 0.2 + structureLevel * 0.06})`);
    body.addColorStop(0.34, `rgba(126, 226, 255, ${0.19 + structureLevel * 0.16 + massLevel * 0.08})`);
    body.addColorStop(0.7, `rgba(48, 154, 232, ${0.14 + massLevel * 0.16 + envelope * 0.06})`);
    body.addColorStop(1, "rgba(14, 68, 158, 0)");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, coreRadius * 1.46, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    for (let ring = 0; ring < 3; ring += 1) {
      const ringRadius = coreRadius * (1.02 + ring * 0.26 + structureLevel * 0.1);
      const sweep = Math.PI * (0.34 + sparkleLevel * 0.24 + ring * 0.03);
      const direction = ring % 2 === 0 ? 1 : -1;
      const rotation = timestamp * (0.0015 + ring * 0.00032) * direction + ring * 1.03;
      const ringAlpha = 0.05 + structureLevel * 0.1 + sparkleLevel * 0.08 - ring * 0.012;

      ctx.shadowColor = `rgba(136, 236, 255, ${0.04 + sparkleLevel * 0.12})`;
      ctx.shadowBlur = 2 + structureLevel * 6 + sparkleLevel * 4;
      ctx.strokeStyle = `rgba(114, 226, 255, ${clamp(ringAlpha, 0.024, 0.26)})`;
      ctx.lineWidth = 1.1 + structureLevel * 0.9 + ring * 0.22;

      for (let pass = 0; pass < 2; pass += 1) {
        const start = rotation + pass * Math.PI;
        ctx.beginPath();
        ctx.ellipse(
          anchor.x,
          anchor.y,
          ringRadius,
          ringRadius * (0.62 + ring * 0.04),
          rotation * 0.25,
          start,
          start + sweep,
        );
        ctx.stroke();
      }
    }

    const filamentCount = 8;
    ctx.shadowBlur = 0;

    for (let index = 0; index < filamentCount; index += 1) {
      const direction = index % 2 === 0 ? 1 : -1;
      const angle = timestamp * 0.00088 * direction + index * ((Math.PI * 2) / filamentCount);
      const innerRadius = coreRadius * (0.42 + 0.04 * Math.sin(timestamp * 0.0012 + index));
      const outerRadius =
        coreRadius
        * (1.08 + 0.26 * (0.5 + 0.5 * Math.sin(timestamp * 0.0019 + index * 0.87 + treble * 2.1)));
      const startX = anchor.x + Math.cos(angle) * innerRadius;
      const startY = anchor.y + Math.sin(angle) * innerRadius;
      const controlAngle = angle + (index % 2 === 0 ? 0.46 : -0.46);
      const controlRadius = (innerRadius + outerRadius) * 0.72;
      const controlX = anchor.x + Math.cos(controlAngle) * controlRadius;
      const controlY = anchor.y + Math.sin(controlAngle) * controlRadius;
      const endX = anchor.x + Math.cos(angle) * outerRadius;
      const endY = anchor.y + Math.sin(angle) * outerRadius;

      ctx.strokeStyle = `rgba(142, 238, 255, ${0.03 + sparkleLevel * 0.13 + envelope * 0.03})`;
      ctx.lineWidth = 0.95 + sparkleLevel * 0.7;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(controlX, controlY, endX, endY);
      ctx.stroke();
    }

    ctx.restore();

    const lensRadius = coreRadius * (0.48 + mid * 0.16 + sparkleLevel * 0.08);
    const lens = ctx.createRadialGradient(
      anchor.x - lensRadius * 0.26,
      anchor.y - lensRadius * 0.18,
      lensRadius * 0.08,
      anchor.x,
      anchor.y,
      lensRadius * 1.85,
    );
    lens.addColorStop(0, `rgba(246, 254, 255, ${0.24 + sparkleLevel * 0.24})`);
    lens.addColorStop(0.42, `rgba(146, 232, 255, ${0.22 + mid * 0.2})`);
    lens.addColorStop(0.72, `rgba(58, 164, 233, ${0.16 + massLevel * 0.16})`);
    lens.addColorStop(1, "rgba(18, 72, 154, 0)");
    ctx.fillStyle = lens;
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, lensRadius * 1.85, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(6, 26, 70, ${0.34 + massLevel * 0.18})`;
    ctx.beginPath();
    ctx.arc(anchor.x - coreRadius * 0.01, anchor.y + coreRadius * 0.02, lensRadius * 0.56, 0, Math.PI * 2);
    ctx.fill();

    const highlight = ctx.createRadialGradient(
      anchor.x + coreRadius * 0.12,
      anchor.y - coreRadius * 0.1,
      0,
      anchor.x + coreRadius * 0.12,
      anchor.y - coreRadius * 0.1,
      coreRadius * 0.4,
    );
    highlight.addColorStop(0, `rgba(255, 255, 255, ${0.54 + sparkleLevel * 0.26 + envelope * 0.08})`);
    highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(anchor.x + coreRadius * 0.12, anchor.y - coreRadius * 0.1, coreRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawForegroundShards(timestamp, { structureLevel, sparkleLevel, envelope }, anchor) {
    const { ctx, width, height, foregroundShards } = this;
    const radiusBase = Math.min(width, height) * (0.34 + structureLevel * 0.12);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const shard of foregroundShards) {
      const orbit = timestamp * shard.speed * 1.35 + shard.phase;
      const angle = orbit + shard.x * Math.PI * 2;
      const orbitalRadius = radiusBase * (0.76 + shard.depth * 0.5);
      const x =
        anchor.x
        + Math.cos(angle) * orbitalRadius
        + Math.sin(timestamp * 0.0007 + shard.phase) * width * 0.01;
      const y =
        anchor.y
        + Math.sin(angle * 1.08) * orbitalRadius * 0.58
        + Math.cos(timestamp * 0.0006 + shard.phase) * height * 0.008;
      const twinkle = 0.45 + 0.55 * Math.sin(timestamp * 0.0022 * shard.twinkle + shard.phase);
      const alpha = clamp(
        shard.alpha * twinkle * (0.45 + sparkleLevel * 1.15 + envelope * 0.26) * (this.isPlaying ? 1 : 0.74),
        0.015,
        0.65,
      );
      const length = 1.6 + shard.radius * (1.8 + sparkleLevel * 2.2);

      ctx.strokeStyle = `rgba(${170 + Math.round(shard.tone * 52)}, ${228 + Math.round(shard.tone * 24)}, 255, ${alpha})`;
      ctx.lineWidth = 0.48 + shard.radius * 0.52;
      ctx.beginPath();
      ctx.moveTo(x - length * 0.45, y - length * 0.18);
      ctx.lineTo(x + length, y + length * 0.24);
      ctx.stroke();

      ctx.fillStyle = `rgba(236, 250, 255, ${alpha * 0.72})`;
      ctx.beginPath();
      ctx.arc(x + length * 0.1, y + length * 0.02, Math.max(0.35, shard.radius * 0.42), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawPanelFrame({ structureLevel, ambientLevel, envelope }) {
    const { ctx, width, height } = this;
    ctx.strokeStyle = `rgba(112, 198, 255, ${0.11 + ambientLevel * 0.13 + structureLevel * 0.05})`;
    ctx.lineWidth = 1.1;
    ctx.strokeRect(0.6, 0.6, width - 1.2, height - 1.2);

    ctx.strokeStyle = `rgba(132, 220, 255, ${0.03 + ambientLevel * 0.07 + envelope * 0.04})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(9.5, 9.5, width - 19, height - 19);

    const topGlow = ctx.createLinearGradient(0, 0, 0, height * 0.24);
    topGlow.addColorStop(0, `rgba(78, 174, 238, ${0.06 + ambientLevel * 0.06 + envelope * 0.02})`);
    topGlow.addColorStop(1, "rgba(16, 48, 92, 0)");
    ctx.fillStyle = topGlow;
    ctx.fillRect(1, 1, width - 2, height * 0.24);
  }
}
