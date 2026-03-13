export class ParticlesLayer {
  constructor() {
    this.items = [];
  }

  seed(count = 0) {
    this.items = Array.from({ length: count }, (_, index) => ({ id: index }));
  }

  update() {
    return this.items;
  }
}
