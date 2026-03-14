const DEFAULT_BANDS = Object.freeze({
  bass: [20, 250],
  mid: [250, 2000],
  treble: [2000, 8000],
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toBinIndex(frequency, nyquist, binCount) {
  const normalized = clamp(frequency / nyquist, 0, 1);
  return Math.floor(normalized * (binCount - 1));
}

function averageRange(data, startIndex, endIndex) {
  if (endIndex < startIndex) {
    return 0;
  }

  let sum = 0;
  let count = 0;

  for (let index = startIndex; index <= endIndex; index += 1) {
    sum += data[index];
    count += 1;
  }

  if (count === 0) {
    return 0;
  }

  return sum / count;
}

export class AudioAnalyser {
  constructor({ analyserNode, audioContext, bands = DEFAULT_BANDS }) {
    if (!analyserNode) {
      throw new Error("Analyser node is required.");
    }

    if (!audioContext) {
      throw new Error("Audio context is required.");
    }

    this.analyserNode = analyserNode;
    this.audioContext = audioContext;
    this.bands = bands;
    this.frequencyData = new Uint8Array(analyserNode.frequencyBinCount);
    this.waveData = new Uint8Array(analyserNode.fftSize);
  }

  getAnalysis() {
    this.captureFrameData();
    return this.computeAnalysis();
  }

  sampleFrame() {
    this.captureFrameData();

    return {
      analysis: this.computeAnalysis(),
      frequencyData: this.frequencyData,
    };
  }

  captureFrameData() {
    this.analyserNode.getByteFrequencyData(this.frequencyData);
    this.analyserNode.getByteTimeDomainData(this.waveData);
  }

  computeAnalysis() {
    const nyquist = this.audioContext.sampleRate / 2;
    const binCount = this.frequencyData.length;

    const bass = this.getBandAverage(this.bands.bass[0], this.bands.bass[1], nyquist, binCount);
    const mid = this.getBandAverage(this.bands.mid[0], this.bands.mid[1], nyquist, binCount);
    const treble = this.getBandAverage(this.bands.treble[0], this.bands.treble[1], nyquist, binCount);
    const amplitude = this.getAmplitude();

    return {
      bass: Math.round(bass),
      mid: Math.round(mid),
      treble: Math.round(treble),
      amplitude: Math.round(amplitude),
    };
  }

  getBandAverage(minHz, maxHz, nyquist, binCount) {
    const startIndex = toBinIndex(minHz, nyquist, binCount);
    const endIndex = toBinIndex(maxHz, nyquist, binCount);
    return averageRange(this.frequencyData, startIndex, endIndex);
  }

  getAmplitude() {
    let sumSquares = 0;

    for (let index = 0; index < this.waveData.length; index += 1) {
      const normalized = (this.waveData[index] - 128) / 128;
      sumSquares += normalized * normalized;
    }

    const rms = Math.sqrt(sumSquares / this.waveData.length);
    return rms * 100;
  }
}
