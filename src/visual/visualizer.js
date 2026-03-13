export class Visualizer {
  constructor({ canvas, analyser }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.analyser = analyser;
    this.rafId = null;
  }

  start() {
    if (this.rafId) {
      return;
    }

    const frame = () => {
      this.draw();
      this.rafId = requestAnimationFrame(frame);
    };

    frame();
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  draw() {
    const { ctx, canvas } = this;
    const data = this.analyser.sampleFrequencyData();
    const barCount = data.length;
    const barWidth = canvas.width / barCount;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#7ce6ff";

    for (let i = 0; i < barCount; i += 1) {
      const value = data[i] / 255;
      const barHeight = value * canvas.height;
      const x = i * barWidth;
      const y = canvas.height - barHeight;
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
    }
  }
}
