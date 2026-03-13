export class AudioAnalyser {
  constructor(analyserNode) {
    this.analyserNode = analyserNode;
    this.frequencyData = new Uint8Array(analyserNode.frequencyBinCount);
    this.waveData = new Uint8Array(analyserNode.fftSize);
  }

  sampleFrequencyData() {
    this.analyserNode.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  sampleWaveData() {
    this.analyserNode.getByteTimeDomainData(this.waveData);
    return this.waveData;
  }
}
