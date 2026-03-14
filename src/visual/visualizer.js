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
    const activity = this.isPlaying
      ? 0.45 + amplitude * 0.55
      : 0.12 + amplitude * 0.12;
    const panelGlow = 0.18 + activity * 0.5;

    const backgroundGradient = ctx.createLinearGradient(0, 0, 0, height);
    backgroundGradient.addColorStop(0, `rgba(6, 16, 36, ${0.95 + activity * 0.04})`);
    backgroundGradient.addColorStop(0.55, "rgba(4, 10, 24, 0.98)");
    backgroundGradient.addColorStop(1, "rgba(2, 6, 14, 1)");

    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, width, height);

    this.drawNebula(timestamp, panelGlow, activity);
    this.drawStarField(timestamp, treble, amplitude, activity);
    this.drawGrid(activity);
    this.drawCenterPulse(timestamp, { bass, mid, treble, amplitude }, activity);
    this.drawNodeNetwork(timestamp, { bass, mid, treble, amplitude });
    this.drawSpectrumBars(timestamp, { bass, mid, treble, amplitude }, activity);
    this.drawPanelFrame(panelGlow, activity);
  }

  drawNebula(timestamp, panelGlow, activity) {
    const { ctx, width, height } = this;
    const driftX = Math.sin(timestamp * 0.00016) * width * 0.024;
    const driftY = Math.cos(timestamp * 0.0002) * height * 0.018;
    const centerX = width * 0.5 + driftX;
    const centerY = height * 0.5 + driftY;
    const radius = Math.max(width, height) * (0.62 + panelGlow * 0.07);

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, `rgba(26, 88, 160, ${0.1 + panelGlow * 0.14 + activity * 0.06})`);
    gradient.addColorStop(0.55, `rgba(14, 45, 95, ${0.04 + activity * 0.05})`);
    gradient.addColorStop(1, "rgba(6, 12, 26, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  drawStarField(timestamp, treble, amplitude, activity) {
    const { ctx, width, height, starField } = this;
    const sparkleGain = this.isPlaying
      ? 0.16 + treble * 0.38 + activity * 0.24
      : 0.08 + activity * 0.14;

    for (const star of starField) {
      const pulse = 0.55 + 0.45 * Math.sin(timestamp * 0.0012 * star.speed + star.phase);
      const alpha = clamp(
        star.alpha * pulse * sparkleGain + amplitude * 0.015 * activity,
        0.015,
        0.42,
      );
      ctx.fillStyle = `rgba(166, 223, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawGrid(activity) {
    const { ctx, width, height } = this;
    const rows = 6;
    const columns = 8;

    ctx.strokeStyle = `rgba(110, 180, 255, ${0.015 + activity * 0.06})`;
    ctx.lineWidth = 0.9;

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

  drawSpectrumBars(timestamp, { bass, mid, treble, amplitude }, activity) {
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
        zoneGain += bass * 1.05;
      } else if (zone < 0.67) {
        zoneGain += mid * 0.9;
      } else {
        zoneGain += treble * 0.95;
      }

      const shimmer = this.isPlaying
        ? 0.5 + 0.5 * Math.sin(timestamp * 0.018 + index * 0.85 + treble * 2.7)
        : 0.25 + 0.15 * Math.sin(timestamp * 0.003 + index * 0.25);
      const idleWave = this.isPlaying
        ? 0.008
        : 0.004 + 0.01 * (Math.sin(timestamp * 0.0018 + index * 0.22) * 0.5 + 0.5);
      const trebleFlicker = zone > 0.67 ? treble * shimmer * (0.16 + activity * 0.1) : 0;
      const target = clamp(this.mappedSpectrum[index] * zoneGain + idleWave + trebleFlicker, 0, 1.05);
      const smoothing = this.isPlaying ? 0.22 + treble * 0.12 : 0.07;
      this.smoothBars[index] = lerp(this.smoothBars[index], target, smoothing);

      const barHeight = Math.max(2, this.smoothBars[index] * drawHeight * (0.66 + activity * 0.54));
      const x = horizontalPadding + index * (barWidth + gap);
      const y = baseY - barHeight;

      const gradient = ctx.createLinearGradient(0, y, 0, baseY);
      gradient.addColorStop(0, `rgba(152, 238, 255, ${0.72 + activity * 0.14})`);
      gradient.addColorStop(0.5, `rgba(72, 174, 255, ${0.42 + activity * 0.18})`);
      gradient.addColorStop(1, "rgba(20, 70, 140, 0.32)");

      ctx.shadowColor = `rgba(99, 218, 255, ${0.08 + activity * 0.28})`;
      ctx.shadowBlur = 4 + activity * 7;
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
      ctx.shadowBlur = 0;
    }

    ctx.strokeStyle = `rgba(142, 205, 255, ${0.22 + activity * 0.2})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(horizontalPadding - 4, baseY + 0.5);
    ctx.lineTo(width - horizontalPadding + 4, baseY + 0.5);
    ctx.stroke();
  }

  drawCenterPulse(timestamp, { bass, mid, treble, amplitude }, activity) {
    const { ctx, width, height } = this;
    const pulse = this.isPlaying ? Math.sin(timestamp * 0.0048 + bass * 6.3) : Math.sin(timestamp * 0.0014);
    const centerX = width * 0.5;
    const centerY = height * 0.42;
    const radius = height * (0.085 + mid * 0.08 + amplitude * 0.06 + pulse * 0.012);

    const halo = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 2.2);
    halo.addColorStop(0, `rgba(82, 235, 255, ${0.08 + activity * 0.16})`);
    halo.addColorStop(0.6, `rgba(42, 140, 215, ${0.04 + activity * 0.09})`);
    halo.addColorStop(1, "rgba(16, 38, 84, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);

    if (activity < 0.18) {
      return;
    }

    const accentCount = 5;
    ctx.strokeStyle = `rgba(166, 231, 255, ${0.02 + treble * 0.1 * activity})`;
    ctx.lineWidth = 1;

    for (let index = 0; index < accentCount; index += 1) {
      const x = width * ((index + 1) / (accentCount + 1));
      const sway = Math.sin(timestamp * 0.003 + index * 0.9) * 3;
      const lineHeight = height * (0.05 + treble * 0.08 * activity);
      ctx.beginPath();
      ctx.moveTo(x + sway, centerY - lineHeight * 0.5);
      ctx.lineTo(x + sway, centerY + lineHeight * 0.5);
      ctx.stroke();
    }
  }

  drawPanelFrame(panelGlow, activity) {
    const { ctx, width, height } = this;
    ctx.strokeStyle = `rgba(116, 206, 255, ${0.26 + panelGlow * 0.18})`;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(0.6, 0.6, width - 1.2, height - 1.2);

    ctx.strokeStyle = `rgba(132, 220, 255, ${0.08 + panelGlow * 0.1 + activity * 0.05})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(8.5, 8.5, width - 17, height - 17);
  }
}
