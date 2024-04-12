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
    // console.log("this.adjacencyList.get(baseNode) should be an array: ", this.adjacencyList.get(baseNode));
  }

  // FOR SOME REASON THE ARRAY IS UNDEFINED FOR EXACTLY 27 EDGES (THIE FRIST 27)
  // AND THEN IT IS CORRECTLY DEFINED FOR THE LAST 10
  // WE JAVE 37 TOTAL EDGES IN TOTAL

  // to add an edge (undirected), I need to update the entries for the baseNode and the connectedNode
  addEdge(baseNode, connectedNode) {
    // console.log("this.adjacencList.get(baseNode) should be an array: ", this.adjacencyList.get(baseNode).push(connectedNode));
    const node = { x: baseNode.x, y: baseNode.y };
    // console.log(
    //   "baseNode",
    //   baseNode,
    //   "this.adjacencyList.get(baseNode) should be an array: ",
    //   this.adjacencyList.get(node)
    // );

    if (!this.adjacencyList.has(baseNode)) {
      this.addNode(baseNode);
    }
    if (!this.adjacencyList.has(connectedNode)) {
      this.addNode(connectedNode);
    }
    this.adjacencyList.get(baseNode).push(connectedNode);
    this.adjacencyList.get(connectedNode).push(baseNode);

    // this.adjacencyList.get(baseNode).push(connectedNode);

    // // do inverse of line above to update the connectedNode also
    // this.adjacencyList.get(connectedNode).push(baseNode);
  }

  compareNodes(node1, node2) {
    return node1.x === node2.x && node1.y === node2.y;
  }
}
