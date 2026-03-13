export class NodeNetwork {
  constructor() {
    this.nodes = [];
  }

  register(node) {
    this.nodes.push(node);
    return node;
  }

  reset() {
    this.nodes = [];
  }
}
