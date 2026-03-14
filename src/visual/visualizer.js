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

function createStarField(count) {
  const stars = [];

  for (let index = 0; index < count; index += 1) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      radius: 0.4 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      speed: 0.35 + Math.random() * 1.25,
      alpha: 0.15 + Math.random() * 0.45,
    });
  }

  return stars;
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
    this.starField = createStarField(28);
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

  render(timestamp = 0) {
    this.resize();

    const { ctx, width, height } = this;
    const bass = this.normalized.bass;
    const mid = this.normalized.mid;
    const treble = this.normalized.treble;
    const amplitude = this.normalized.amplitude;
    const envelope = this.isPlaying ? 0.2 + amplitude * 0.34 : 0.08 + amplitude * 0.08;
    const massLevel = clamp(
      (this.isPlaying ? 0.14 : 0.08) + bass * 0.54 + amplitude * 0.08,
      0.08,
      0.92,
    );
    const structureLevel = clamp(
      (this.isPlaying ? 0.18 : 0.1) + mid * 0.5 + amplitude * 0.06,
      0.1,
      0.9,
    );
    const sparkleLevel = clamp(
      (this.isPlaying ? 0.07 : 0.04) + treble * 0.64 + amplitude * 0.04,
      0.04,
      0.95,
    );
    const ambientLevel = clamp(
      (this.isPlaying ? 0.12 : 0.08) + mid * 0.2 + bass * 0.12 + amplitude * 0.08,
      0.08,
      0.7,
    );
    const panelGlow = 0.1 + ambientLevel * 0.26 + structureLevel * 0.06;

    const backgroundGradient = ctx.createLinearGradient(0, 0, 0, height);
    backgroundGradient.addColorStop(
      0,
      `rgba(6, 16, 36, ${0.96 + ambientLevel * 0.025 + envelope * 0.01})`,
    );
    backgroundGradient.addColorStop(0.55, "rgba(4, 10, 24, 0.98)");
    backgroundGradient.addColorStop(1, "rgba(2, 6, 14, 1)");

    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, width, height);

    this.drawNebula(timestamp, { ambientLevel, structureLevel, massLevel, envelope });
    this.drawStarField(timestamp, { treble, amplitude, sparkleLevel, envelope });
    this.drawGrid(structureLevel, ambientLevel);
    this.drawCenterPulse(
      timestamp,
      { bass, mid, treble, amplitude },
      { massLevel, structureLevel, sparkleLevel, envelope },
    );
    this.drawNodeNetwork(timestamp, { bass, mid, treble, amplitude });
    this.drawSpectrumBars(timestamp, { bass, mid, treble, amplitude }, { structureLevel, envelope });
    this.drawPanelFrame(panelGlow, structureLevel);
  }

  drawNebula(timestamp, { ambientLevel, structureLevel, massLevel, envelope }) {
    const { ctx, width, height } = this;
    const driftX = Math.sin(timestamp * 0.00016) * width * 0.024;
    const driftY = Math.cos(timestamp * 0.0002) * height * 0.018;
    const centerX = width * 0.5 + driftX;
    const centerY = height * 0.5 + driftY;
    const radius = Math.max(width, height) * (0.58 + massLevel * 0.12 + structureLevel * 0.04);

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(
      0,
      `rgba(22, 76, 146, ${0.065 + ambientLevel * 0.07 + structureLevel * 0.08 + envelope * 0.025})`,
    );
    gradient.addColorStop(
      0.55,
      `rgba(10, 34, 78, ${0.028 + ambientLevel * 0.035 + structureLevel * 0.045 + envelope * 0.014})`,
    );
    gradient.addColorStop(1, "rgba(6, 12, 26, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  drawStarField(timestamp, { treble, amplitude, sparkleLevel, envelope }) {
    const { ctx, width, height, starField } = this;
    const sparkleGain = this.isPlaying
      ? 0.12 + sparkleLevel * 0.4 + treble * 0.18 + envelope * 0.05
      : 0.06 + sparkleLevel * 0.16;

    for (const star of starField) {
      const pulse = 0.55 + 0.45 * Math.sin(timestamp * 0.0012 * star.speed + star.phase);
      const alpha = clamp(
        star.alpha * pulse * sparkleGain + treble * 0.012 + amplitude * 0.005,
        0.012,
        0.38,
      );
      ctx.fillStyle = `rgba(178, 230, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawGrid(structureLevel, ambientLevel) {
    const { ctx, width, height } = this;
    const rows = 6;
    const columns = 8;

    ctx.strokeStyle = `rgba(110, 180, 255, ${0.012 + structureLevel * 0.045 + ambientLevel * 0.014})`;
    ctx.lineWidth = 0.85;

    for (let row = 1; row < rows; row += 1) {
      const y = (height / rows) * row;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    for (let column = 1; column < columns; column += 1) {
      const x = (width / columns) * column;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }

  drawNodeNetwork(timestamp, normalizedAnalysis) {
    this.nodeNetwork.render(this.ctx, {
      width: this.width,
      height: this.height,
      timestamp,
      normalizedAnalysis,
      isPlaying: this.isPlaying,
    });
  }

  drawSpectrumBars(timestamp, { bass, mid, treble, amplitude }, { structureLevel, envelope }) {
    const { ctx, width, height } = this;
    const horizontalPadding = 18;
    const baseY = height - 24;
    const topLimit = 28;
    const drawHeight = Math.max(40, baseY - topLimit);
    const gap = 2;
    const usableWidth = width - horizontalPadding * 2;
    const barWidth = Math.max(2, (usableWidth - gap * (this.barCount - 1)) / this.barCount);

    for (let index = 0; index < this.barCount; index += 1) {
      const zone = index / (this.barCount - 1);
      let zoneGain = 1;

      if (zone < 0.33) {
        zoneGain += bass * 0.88;
      } else if (zone < 0.67) {
        zoneGain += mid * 0.78;
      } else {
        zoneGain += treble * 0.84;
      }

      const shimmer = this.isPlaying
        ? 0.5 + 0.5 * Math.sin(timestamp * 0.018 + index * 0.85 + treble * 2.7)
        : 0.25 + 0.15 * Math.sin(timestamp * 0.003 + index * 0.25);
      const idleWave = this.isPlaying
        ? 0.008
        : 0.004 + 0.01 * (Math.sin(timestamp * 0.0018 + index * 0.22) * 0.5 + 0.5);
      const trebleFlicker = zone > 0.67 ? treble * shimmer * (0.11 + envelope * 0.06) : 0;
      const target = clamp(this.mappedSpectrum[index] * zoneGain + idleWave + trebleFlicker, 0, 1.02);
      const smoothing = this.isPlaying ? 0.2 + treble * 0.1 : 0.07;
      this.smoothBars[index] = lerp(this.smoothBars[index], target, smoothing);

      const roleLift = zone < 0.33 ? bass : zone < 0.67 ? mid : treble;
      const barHeight = Math.max(
        2,
        this.smoothBars[index] * drawHeight * (0.54 + roleLift * 0.23 + amplitude * 0.08 + envelope * 0.05),
      );
      const x = horizontalPadding + index * (barWidth + gap);
      const y = baseY - barHeight;

      const gradient = ctx.createLinearGradient(0, y, 0, baseY);
      gradient.addColorStop(0, `rgba(152, 238, 255, ${0.46 + roleLift * 0.12 + envelope * 0.06})`);
      gradient.addColorStop(0.5, `rgba(72, 174, 255, ${0.28 + roleLift * 0.1 + envelope * 0.04})`);
      gradient.addColorStop(1, "rgba(20, 70, 140, 0.24)");

      ctx.shadowColor = `rgba(99, 218, 255, ${0.035 + roleLift * 0.08 + envelope * 0.08})`;
      ctx.shadowBlur = 2 + roleLift * 1.8 + envelope * 2.4;
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
      ctx.shadowBlur = 0;
    }

    ctx.strokeStyle = `rgba(142, 205, 255, ${0.15 + structureLevel * 0.09 + envelope * 0.04})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(horizontalPadding - 4, baseY + 0.5);
    ctx.lineTo(width - horizontalPadding + 4, baseY + 0.5);
    ctx.stroke();
  }

  drawCenterPulse(
    timestamp,
    { bass, mid, treble, amplitude },
    { massLevel, structureLevel, sparkleLevel, envelope },
  ) {
    const { ctx, width, height } = this;
    const pulse = this.isPlaying ? Math.sin(timestamp * 0.0038 + bass * 7.2) : Math.sin(timestamp * 0.0014);
    const centerX = width * 0.5;
    const centerY = height * 0.42;
    const radius = height * (0.082 + bass * 0.1 + amplitude * 0.03 + pulse * 0.013);

    const halo = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 2.45);
    halo.addColorStop(
      0,
      `rgba(70, 208, 255, ${0.045 + mid * 0.13 + structureLevel * 0.06 + envelope * 0.02})`,
    );
    halo.addColorStop(0.58, `rgba(34, 118, 192, ${0.024 + mid * 0.09 + envelope * 0.02})`);
    halo.addColorStop(1, "rgba(16, 38, 84, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);

    const coreBody = ctx.createRadialGradient(centerX, centerY, radius * 0.08, centerX, centerY, radius * 1.08);
    coreBody.addColorStop(
      0,
      `rgba(136, 235, 255, ${0.16 + mid * 0.16 + structureLevel * 0.06 + massLevel * 0.03})`,
    );
    coreBody.addColorStop(0.62, `rgba(58, 164, 230, ${0.09 + bass * 0.1 + envelope * 0.03})`);
    coreBody.addColorStop(1, "rgba(24, 80, 148, 0)");
    ctx.fillStyle = coreBody;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 1.08, 0, Math.PI * 2);
    ctx.fill();

    const brightCoreRadius = radius * (0.26 + treble * 0.22 + sparkleLevel * 0.06);
    const brightCore = ctx.createRadialGradient(
      centerX,
      centerY,
      brightCoreRadius * 0.08,
      centerX,
      centerY,
      brightCoreRadius * 1.9,
    );
    brightCore.addColorStop(0, `rgba(245, 253, 255, ${0.44 + treble * 0.38})`);
    brightCore.addColorStop(0.5, `rgba(186, 241, 255, ${0.2 + treble * 0.24 + envelope * 0.04})`);
    brightCore.addColorStop(1, "rgba(140, 220, 255, 0)");
    ctx.fillStyle = brightCore;
    ctx.beginPath();
    ctx.arc(centerX, centerY, brightCoreRadius * 1.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${0.32 + treble * 0.34 + envelope * 0.06})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, brightCoreRadius * 0.42, 0, Math.PI * 2);
    ctx.fill();

    if (sparkleLevel < 0.14) {
      return;
    }

    const arcRadius = radius * (0.9 + treble * 0.22);
    const arcSweep = Math.PI * (0.18 + treble * 0.16);
    const arcStart = timestamp * 0.0045 + treble * 1.8;
    ctx.strokeStyle = `rgba(223, 248, 255, ${0.06 + treble * 0.2})`;
    ctx.lineWidth = 0.8 + treble * 0.8;

    for (let index = 0; index < 2; index += 1) {
      const phase = arcStart + index * Math.PI;
      ctx.beginPath();
      ctx.arc(centerX, centerY, arcRadius, phase, phase + arcSweep);
      ctx.stroke();
    }
  }

  drawPanelFrame(panelGlow, structureLevel) {
    const { ctx, width, height } = this;
    ctx.strokeStyle = `rgba(116, 206, 255, ${0.18 + panelGlow * 0.1})`;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(0.6, 0.6, width - 1.2, height - 1.2);

    ctx.strokeStyle = `rgba(132, 220, 255, ${0.045 + panelGlow * 0.07 + structureLevel * 0.02})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(8.5, 8.5, width - 17, height - 17);
  }
}
