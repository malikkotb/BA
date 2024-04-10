export class Graph {
    constructor(context, nodeMidpoits, centroids, edges) {
      this.openSet = [];
      this.closedSet = [];
      this.context = context;
      this.edgeIndex = 0;
      this.paths = [];
      this.nodes = [...nodeMidpoits, ...centroids] // list of all nodes in our graph (combined nodeMidpoints and triangle centroids)
      this.edges = edges; // list of edges in our graph

    }

    // TODO: make adjacency list from nodes and edges 


}