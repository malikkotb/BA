export class Graph {
  constructor(context, nodes, edges) {
    // Represent the graph (nodes & edges) as an adjacency list
    this.context = context;
    this.nodes = nodes; // list of all nodes in our graph (combined nodeMidpoints and triangle centroids)
    this.edges = edges; // list of edges in our graph

    // implement an adjacency list as a set of key-value pairs
    // where the key is the node (base-node)
    // and the value is an array represnting what other nodes the base-node is connected to

    // we will use a Map() for this, because it has additional useful API methods
    // and it behaves more like a dictionary or hashMap (found in other languages)
    this.adjacencyList = new Map(); // so the map is our graph

    // Create the graph
    this.nodes.forEach((baseNode) => this.addNode(baseNode));
    this.edges.forEach((edge) => this.addEdge(edge[0], edge[1])); // destructure both the baseNode and connectedNode from an edge
  }

  // add Node to the Map
  addNode(baseNode) {
    this.adjacencyList.set(baseNode, []); // baseNode + empty array for connections
  }


  // to add an edge (undirected), I need to update the entries for the baseNode and the connectedNode
  addEdge(baseNode, connectedNode) {
    
  }

  compareNodes(node1, node2) {
    return node1.x === node2.x && node1.y === node2.y;
  }
}
