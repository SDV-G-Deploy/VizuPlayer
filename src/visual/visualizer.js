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
    radiusMin = 0.4,
    radiusMax = 1.7,
    alphaMin = 0.02,
    alphaMax = 0.2,
    driftMin = 0.0005,
    driftMax = 0.0026,
    speedMin = 0.00006,
    speedMax = 0.00025,
  } = {},
) {
  const field = [];

  for (let index = 0; index < count; index += 1) {
    field.push({
      x: Math.random(),
      y: Math.random(),
      radius: radiusMin + Math.random() * (radiusMax - radiusMin),
      alpha: alphaMin + Math.random() * (alphaMax - alphaMin),
      twinkle: 0.65 + Math.random() * 1.2,
      speed: speedMin + Math.random() * (speedMax - speedMin),
      driftX: driftMin + Math.random() * (driftMax - driftMin),
      driftY: driftMin + Math.random() * (driftMax - driftMin),
      phase: Math.random() * Math.PI * 2,
      tone: Math.random(),
      depth: 0.52 + Math.random() * 0.85,
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
    this.coronaStride = 2;
    this.deepDust = createDustField(64, {
      radiusMin: 0.24,
      radiusMax: 0.95,
      alphaMin: 0.016,
      alphaMax: 0.09,
      driftMin: 0.00035,
      driftMax: 0.0015,
      speedMin: 0.00004,
      speedMax: 0.00012,
    });
    this.midDust = createDustField(28, {
      radiusMin: 0.45,
      radiusMax: 1.45,
      alphaMin: 0.028,
      alphaMax: 0.16,
      driftMin: 0.0006,
      driftMax: 0.0021,
      speedMin: 0.00007,
      speedMax: 0.00022,
    });
    this.sparkleDust = createDustField(10, {
      radiusMin: 0.68,
      radiusMax: 1.8,
      alphaMin: 0.04,
      alphaMax: 0.26,
      driftMin: 0.0007,
      driftMax: 0.0024,
      speedMin: 0.00008,
      speedMax: 0.00024,
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

  getCoreAnchor(timestamp, flowLevel, envelope) {
    const driftStrength = this.isPlaying ? 1 : 0.45;
    const driftX =
      Math.sin(timestamp * 0.00017 + flowLevel * 2.2)
      * this.width
      * (0.007 + envelope * 0.008)
      * driftStrength;
    const driftY =
      Math.cos(timestamp * 0.00014 + flowLevel * 1.7)
      * this.height
      * (0.005 + envelope * 0.006)
      * driftStrength;

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
    const envelope = this.isPlaying ? 0.18 + amplitude * 0.35 : 0.08 + amplitude * 0.08;
    const massLevel = clamp((this.isPlaying ? 0.16 : 0.1) + bass * 0.6 + amplitude * 0.06, 0.1, 0.92);
    const flowLevel = clamp((this.isPlaying ? 0.18 : 0.11) + mid * 0.58 + amplitude * 0.07, 0.11, 0.92);
    const sparkleLevel = clamp((this.isPlaying ? 0.08 : 0.04) + treble * 0.66 + amplitude * 0.04, 0.04, 0.96);
    const ambientLevel = clamp(
      (this.isPlaying ? 0.13 : 0.09) + bass * 0.13 + mid * 0.2 + amplitude * 0.07,
      0.09,
      0.72,
    );
    const anchor = this.getCoreAnchor(timestamp, flowLevel, envelope);

    this.drawVoidBackdrop({ ambientLevel, flowLevel, envelope }, anchor);
    this.drawAtmosphere(timestamp, { ambientLevel, flowLevel, massLevel, sparkleLevel }, anchor);
    this.drawDustField(timestamp, this.deepDust, { ambientLevel, sparkleLevel, envelope }, anchor, 0.72);
    this.drawDustField(timestamp, this.midDust, { ambientLevel, sparkleLevel, envelope }, anchor, 1);
    this.drawPlasmaVeils(
      timestamp,
      { bass, mid, treble, amplitude },
      { massLevel, flowLevel, sparkleLevel, envelope },
      anchor,
    );
    this.drawNodeNetwork(timestamp, { bass, mid, treble, amplitude }, anchor);
    this.drawSpectrumCorona(
      timestamp,
      { bass, mid, treble, amplitude },
      { massLevel, flowLevel, sparkleLevel, envelope },
      anchor,
    );
    this.drawCosmicCore(
      timestamp,
      { bass, mid, treble, amplitude },
      { massLevel, flowLevel, sparkleLevel, envelope },
      anchor,
    );
    this.drawSparkleDust(timestamp, { sparkleLevel, envelope }, anchor);
    this.drawPanelFrame({ ambientLevel, flowLevel, envelope });
  }

  drawVoidBackdrop({ ambientLevel, flowLevel, envelope }, anchor) {
    const { ctx, width, height } = this;
    const background = ctx.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, `rgba(2, 7, 21, ${0.97 + ambientLevel * 0.02})`);
    background.addColorStop(0.52, `rgba(2, 6, 16, ${0.985 + flowLevel * 0.01})`);
    background.addColorStop(1, "rgba(0, 2, 9, 1)");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const centerLift = ctx.createRadialGradient(
      anchor.x,
      anchor.y,
      height * 0.07,
      anchor.x,
      anchor.y,
      Math.max(width, height) * 0.78,
    );
    centerLift.addColorStop(0, `rgba(14, 44, 98, ${0.09 + ambientLevel * 0.12 + envelope * 0.03})`);
    centerLift.addColorStop(0.54, `rgba(6, 18, 54, ${0.05 + ambientLevel * 0.08 + flowLevel * 0.04})`);
    centerLift.addColorStop(1, "rgba(1, 4, 15, 0)");
    ctx.fillStyle = centerLift;
    ctx.fillRect(0, 0, width, height);

    const violetAccent = ctx.createRadialGradient(
      anchor.x + width * 0.08,
      anchor.y - height * 0.1,
      height * 0.03,
      anchor.x + width * 0.08,
      anchor.y - height * 0.1,
      Math.max(width, height) * 0.52,
    );
    violetAccent.addColorStop(0, `rgba(120, 112, 234, ${0.015 + envelope * 0.03})`);
    violetAccent.addColorStop(1, "rgba(66, 88, 182, 0)");
    ctx.fillStyle = violetAccent;
    ctx.fillRect(0, 0, width, height);

    const vignette = ctx.createRadialGradient(
      anchor.x,
      anchor.y,
      Math.min(width, height) * 0.24,
      anchor.x,
      anchor.y,
      Math.max(width, height) * 0.95,
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(0.72, `rgba(0, 0, 0, ${0.2 + ambientLevel * 0.08})`);
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.72)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  drawAtmosphere(timestamp, { ambientLevel, flowLevel, massLevel, sparkleLevel }, anchor) {
    const { ctx, width, height } = this;
    const longestSide = Math.max(width, height);
    const plumes = [
      {
        offsetX: -0.18,
        offsetY: -0.14,
        radius: 0.64,
        color: [38, 108, 196],
        alpha: 0.035 + ambientLevel * 0.075 + flowLevel * 0.03,
      },
      {
        offsetX: 0.2,
        offsetY: 0.06,
        radius: 0.58,
        color: [26, 132, 196],
        alpha: 0.03 + ambientLevel * 0.06 + massLevel * 0.03,
      },
      {
        offsetX: 0.04,
        offsetY: 0.24,
        radius: 0.56,
        color: [90, 114, 216],
        alpha: 0.012 + sparkleLevel * 0.035,
      },
    ];

    for (let index = 0; index < plumes.length; index += 1) {
      const plume = plumes[index];
      const driftX = Math.sin(timestamp * (0.00006 + index * 0.000014) + index * 1.5) * width * 0.014;
      const driftY = Math.cos(timestamp * (0.00005 + index * 0.000013) + index) * height * 0.012;
      const x = anchor.x + width * plume.offsetX + driftX;
      const y = anchor.y + height * plume.offsetY + driftY;
      const radius = longestSide * (plume.radius + massLevel * 0.06);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${plume.color[0]}, ${plume.color[1]}, ${plume.color[2]}, ${plume.alpha})`);
      gradient.addColorStop(0.58, `rgba(${Math.round(plume.color[0] * 0.62)}, ${Math.round(plume.color[1] * 0.62)}, ${Math.round(plume.color[2] * 0.62)}, ${plume.alpha * 0.48})`);
      gradient.addColorStop(1, "rgba(8, 24, 56, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
  }

  drawDustField(timestamp, field, { ambientLevel, sparkleLevel, envelope }, anchor, layerGain = 1) {
    const { ctx, width, height } = this;
    const anchorShiftX = (anchor.x / width - 0.5) * 0.014 * layerGain;
    const anchorShiftY = (anchor.y / height - 0.44) * 0.018 * layerGain;

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
            + Math.sin(driftTime * 1.1 + particle.phase * 0.82) * particle.driftY * layerGain
            + anchorShiftY * particle.depth,
        ) * height;
      const twinkle = 0.5 + 0.5 * Math.sin(timestamp * 0.0016 * particle.twinkle + particle.phase);
      const alpha = clamp(
        particle.alpha
          * twinkle
          * (0.32 + ambientLevel * 0.82 + sparkleLevel * 0.24 + envelope * 0.2)
          * (this.isPlaying ? 1 : 0.74),
        0.006,
        0.35,
      );
      const red = 98 + Math.round(particle.tone * 44);
      const green = 170 + Math.round(particle.tone * 56);
      const blue = 236 + Math.round(particle.tone * 18);

      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, particle.radius * particle.depth * layerGain, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPlasmaVeils(
    timestamp,
    { bass, mid, treble },
    { massLevel, flowLevel, sparkleLevel, envelope },
    anchor,
  ) {
    const { ctx, width, height } = this;
    const coreRadius = Math.min(width, height) * (0.13 + massLevel * 0.08);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (let index = 0; index < 3; index += 1) {
      const phase = timestamp * (0.00028 + index * 0.00006) + index * 1.85;
      const angle = phase + Math.sin(timestamp * 0.0005 + index) * 0.22;
      const innerRadius = coreRadius * (0.82 + index * 0.24 + flowLevel * 0.12);
      const outerRadius = coreRadius * (1.8 + index * 0.28 + flowLevel * 0.4 + bass * 0.22);
      const spread = 0.42 + flowLevel * 0.34 + (index === 1 ? 0.08 : 0);
      const startX = anchor.x + Math.cos(angle - spread) * innerRadius;
      const startY = anchor.y + Math.sin(angle - spread) * innerRadius;
      const endX = anchor.x + Math.cos(angle + spread) * innerRadius;
      const endY = anchor.y + Math.sin(angle + spread) * innerRadius;
      const tipX = anchor.x + Math.cos(angle) * outerRadius;
      const tipY = anchor.y + Math.sin(angle) * outerRadius;
      const ctrl1X = anchor.x + Math.cos(angle - spread * 0.3) * outerRadius * 0.66;
      const ctrl1Y = anchor.y + Math.sin(angle - spread * 0.3) * outerRadius * 0.66;
      const ctrl2X = anchor.x + Math.cos(angle + spread * 0.3) * outerRadius * 0.66;
      const ctrl2Y = anchor.y + Math.sin(angle + spread * 0.3) * outerRadius * 0.66;
      const backX = anchor.x + Math.cos(angle + Math.PI) * innerRadius * 0.6;
      const backY = anchor.y + Math.sin(angle + Math.PI) * innerRadius * 0.6;

      const gradient = ctx.createLinearGradient(anchor.x, anchor.y, tipX, tipY);
      gradient.addColorStop(0, `rgba(40, 132, 214, ${0.05 + flowLevel * 0.1 + massLevel * 0.04})`);
      gradient.addColorStop(0.62, `rgba(94, 212, 248, ${0.07 + flowLevel * 0.13 + sparkleLevel * 0.05})`);
      gradient.addColorStop(1, `rgba(198, 230, 255, ${0.02 + treble * 0.08 + envelope * 0.03})`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(ctrl1X, ctrl1Y, tipX, tipY);
      ctx.quadraticCurveTo(ctrl2X, ctrl2Y, endX, endY);
      ctx.quadraticCurveTo(backX, backY, startX, startY);
      ctx.fill();
    }

    const centerMist = ctx.createRadialGradient(
      anchor.x,
      anchor.y,
      coreRadius * 0.2,
      anchor.x,
      anchor.y,
      coreRadius * 2.2,
    );
    centerMist.addColorStop(0, `rgba(86, 206, 246, ${0.06 + flowLevel * 0.1})`);
    centerMist.addColorStop(1, "rgba(26, 76, 156, 0)");
    ctx.fillStyle = centerMist;
    ctx.fillRect(0, 0, width, height);

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
    { massLevel, flowLevel, sparkleLevel, envelope },
    anchor,
  ) {
    const { ctx, width, height } = this;
    const sweep = Math.PI * 1.72;
    const startAngle = -Math.PI * 0.86 + Math.sin(timestamp * 0.00022) * 0.04;
    const baseRadius = Math.min(width, height) * (0.28 + massLevel * 0.08);
    const radialScale = Math.min(width, height) * (0.08 + flowLevel * 0.07);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    for (let index = 0; index < this.barCount; index += this.coronaStride) {
      const zone = index / (this.barCount - 1);
      let zoneGain = 1;

      if (zone < 0.34) {
        zoneGain += bass * 0.86;
      } else if (zone < 0.67) {
        zoneGain += mid * 0.8;
      } else {
        zoneGain += treble * 0.86;
      }

      const shimmer = this.isPlaying
        ? 0.5 + 0.5 * Math.sin(timestamp * 0.013 + index * 0.6 + treble * 2.4)
        : 0.35 + 0.18 * Math.sin(timestamp * 0.0025 + index * 0.2);
      const idleWave = this.isPlaying
        ? 0.004
        : 0.0025 + 0.007 * (Math.sin(timestamp * 0.0012 + index * 0.22) * 0.5 + 0.5);
      const trebleAccent = zone > 0.67 ? treble * shimmer * (0.09 + envelope * 0.05) : 0;
      const target = clamp(this.mappedSpectrum[index] * zoneGain + idleWave + trebleAccent, 0, 1.04);
      const smoothing = this.isPlaying ? 0.2 + treble * 0.08 : 0.08;
      this.smoothBars[index] = lerp(this.smoothBars[index], target, smoothing);

      const roleLift = zone < 0.34 ? bass : zone < 0.67 ? mid : treble;
      const length =
        this.smoothBars[index]
        * radialScale
        * (0.64 + roleLift * 0.28 + amplitude * 0.08 + envelope * 0.1);
      const angle = startAngle + zone * sweep + Math.sin(timestamp * 0.0007 + index * 0.3) * 0.008;
      const inner = baseRadius * (1.03 + flowLevel * 0.08);
      const outer = inner + 2 + length;
      const x1 = anchor.x + Math.cos(angle) * inner;
      const y1 = anchor.y + Math.sin(angle) * inner;
      const x2 = anchor.x + Math.cos(angle) * outer;
      const y2 = anchor.y + Math.sin(angle) * outer;

      let red = 94;
      let green = 202;
      let blue = 248;

      if (zone >= 0.67) {
        red = 214;
        green = 238;
        blue = 255;
      } else if (zone >= 0.34) {
        red = 124;
        green = 188;
        blue = 255;
      }

      ctx.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${0.06 + roleLift * 0.16 + sparkleLevel * 0.04})`;
      ctx.lineWidth = 1.2 + roleLift * 0.8 + envelope * 0.35;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.strokeStyle = `rgba(106, 206, 248, ${0.055 + flowLevel * 0.08 + envelope * 0.03})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, baseRadius * (1.04 + flowLevel * 0.08), startAngle, startAngle + sweep);
    ctx.stroke();

    ctx.restore();
  }

  drawCosmicCore(
    timestamp,
    { bass, mid, treble },
    { massLevel, flowLevel, sparkleLevel, envelope },
    anchor,
  ) {
    const { ctx, width, height } = this;
    const pulse = this.isPlaying ? Math.sin(timestamp * 0.0035 + bass * 6.8) : Math.sin(timestamp * 0.0015 + 0.6);
    const coreRadius = Math.min(width, height) * (0.14 + massLevel * 0.11 + envelope * 0.026 + pulse * 0.01);

    const bloom = ctx.createRadialGradient(anchor.x, anchor.y, coreRadius * 0.18, anchor.x, anchor.y, coreRadius * 3.4);
    bloom.addColorStop(0, `rgba(86, 212, 255, ${0.12 + flowLevel * 0.12 + sparkleLevel * 0.04})`);
    bloom.addColorStop(0.45, `rgba(40, 134, 218, ${0.08 + flowLevel * 0.09 + massLevel * 0.04})`);
    bloom.addColorStop(1, "rgba(14, 44, 108, 0)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const lobeCount = 5;
    for (let index = 0; index < lobeCount; index += 1) {
      const angle = timestamp * (0.00055 + index * 0.00008) + index * ((Math.PI * 2) / lobeCount);
      const length = coreRadius * (1.25 + flowLevel * 0.45 + Math.sin(timestamp * 0.001 + index) * 0.1);
      const widthScale = coreRadius * (0.46 + flowLevel * 0.2 + (index % 2 === 0 ? 0.04 : -0.02));
      const startX = anchor.x + Math.cos(angle - 0.5) * widthScale;
      const startY = anchor.y + Math.sin(angle - 0.5) * widthScale;
      const endX = anchor.x + Math.cos(angle + 0.5) * widthScale;
      const endY = anchor.y + Math.sin(angle + 0.5) * widthScale;
      const tipX = anchor.x + Math.cos(angle) * length;
      const tipY = anchor.y + Math.sin(angle) * length;
      const centerPullX = anchor.x + Math.cos(angle + Math.PI) * coreRadius * 0.2;
      const centerPullY = anchor.y + Math.sin(angle + Math.PI) * coreRadius * 0.2;
      const gradient = ctx.createLinearGradient(anchor.x, anchor.y, tipX, tipY);

      gradient.addColorStop(0, `rgba(52, 168, 236, ${0.1 + flowLevel * 0.12})`);
      gradient.addColorStop(0.66, `rgba(124, 226, 255, ${0.1 + sparkleLevel * 0.14 + treble * 0.05})`);
      gradient.addColorStop(1, "rgba(218, 247, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(
        anchor.x + Math.cos(angle - 0.2) * length * 0.64,
        anchor.y + Math.sin(angle - 0.2) * length * 0.64,
        tipX,
        tipY,
      );
      ctx.quadraticCurveTo(
        anchor.x + Math.cos(angle + 0.2) * length * 0.64,
        anchor.y + Math.sin(angle + 0.2) * length * 0.64,
        endX,
        endY,
      );
      ctx.quadraticCurveTo(centerPullX, centerPullY, startX, startY);
      ctx.fill();
    }

    const body = ctx.createRadialGradient(
      anchor.x - coreRadius * 0.2,
      anchor.y - coreRadius * 0.18,
      coreRadius * 0.05,
      anchor.x,
      anchor.y,
      coreRadius * 1.45,
    );
    body.addColorStop(0, `rgba(250, 255, 255, ${0.5 + sparkleLevel * 0.18})`);
    body.addColorStop(0.28, `rgba(168, 238, 255, ${0.34 + flowLevel * 0.18})`);
    body.addColorStop(0.58, `rgba(86, 186, 255, ${0.24 + massLevel * 0.18})`);
    body.addColorStop(0.84, `rgba(82, 122, 228, ${0.13 + sparkleLevel * 0.08})`);
    body.addColorStop(1, "rgba(32, 74, 180, 0)");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, coreRadius * 1.45, 0, Math.PI * 2);
    ctx.fill();

    const singularity = ctx.createRadialGradient(
      anchor.x + coreRadius * 0.08,
      anchor.y - coreRadius * 0.07,
      0,
      anchor.x + coreRadius * 0.08,
      anchor.y - coreRadius * 0.07,
      coreRadius * 0.5,
    );
    singularity.addColorStop(0, `rgba(255, 255, 255, ${0.66 + sparkleLevel * 0.2 + envelope * 0.06})`);
    singularity.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = singularity;
    ctx.beginPath();
    ctx.arc(anchor.x + coreRadius * 0.08, anchor.y - coreRadius * 0.07, coreRadius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    if (sparkleLevel > 0.24) {
      const sparkCount = sparkleLevel > 0.58 ? 3 : 2;
      for (let index = 0; index < sparkCount; index += 1) {
        const angle = timestamp * 0.0012 + index * (Math.PI * 2 / sparkCount) + treble * 0.8;
        const radius = coreRadius * (0.7 + index * 0.26);
        const x = anchor.x + Math.cos(angle) * radius;
        const y = anchor.y + Math.sin(angle) * radius;
        ctx.fillStyle = `rgba(236, 250, 255, ${0.18 + sparkleLevel * 0.26})`;
        ctx.beginPath();
        ctx.arc(x, y, 1 + sparkleLevel * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawSparkleDust(timestamp, { sparkleLevel, envelope }, anchor) {
    const { ctx, width, height, sparkleDust } = this;
    const radiusBase = Math.min(width, height) * 0.34;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const spark of sparkleDust) {
      const orbit = timestamp * spark.speed * 1.15 + spark.phase;
      const angle = orbit + spark.x * Math.PI * 2;
      const radius = radiusBase * (0.64 + spark.depth * 0.44);
      const x = anchor.x + Math.cos(angle) * radius;
      const y = anchor.y + Math.sin(angle * 1.08) * radius * 0.6;
      const twinkle = 0.5 + 0.5 * Math.sin(timestamp * 0.002 * spark.twinkle + spark.phase);
      const alpha = clamp(
        spark.alpha * twinkle * (0.34 + sparkleLevel * 0.92 + envelope * 0.2) * (this.isPlaying ? 1 : 0.72),
        0.02,
        0.5,
      );

      ctx.fillStyle = `rgba(220, 246, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.48, spark.radius * 0.34), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawPanelFrame({ ambientLevel, flowLevel, envelope }) {
    const { ctx, width, height } = this;
    ctx.strokeStyle = `rgba(106, 192, 244, ${0.09 + ambientLevel * 0.08 + flowLevel * 0.03})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.6, 0.6, width - 1.2, height - 1.2);

    const topGlow = ctx.createLinearGradient(0, 0, 0, height * 0.22);
    topGlow.addColorStop(0, `rgba(88, 178, 236, ${0.05 + ambientLevel * 0.05 + envelope * 0.02})`);
    topGlow.addColorStop(1, "rgba(18, 44, 88, 0)");
    ctx.fillStyle = topGlow;
    ctx.fillRect(1, 1, width - 2, height * 0.22);
  }
}
