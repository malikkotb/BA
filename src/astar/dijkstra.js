export class Dijkstra {
  // Use Dijkstra's algorithm when you need to find
  // the shortest path in a weighted graph with non-negative edge weights.
  // TODO: I can perhaps add weights to the edges for edges that are crossing another edge or sth. similar like that to influence the path.
  // TODO: figure out how to set the edge weights:
  // maybe keep track of what edges are already rendered
  // and then figure out how to

  // Dijkstra is suitable for finding the shortest path from a single source vertex to all other vertices !!!

  constructor(adjacencyList) {
    this.adjacencyList = adjacencyList;
  }


  findPaths() {
    console.log(this.adjacencyList);
  }
}

// Since your graph is represented as an adjacency list and the edges have weights, one of the most suitable graph search algorithms to implement would be Dijkstra's Algorithm. Dijkstra's Algorithm is specifically designed to find the shortest path from a single source node to all other nodes in a graph with non-negative edge weights.
// Here's why Dijkstra's Algorithm is a good fit:
// Efficiency: Dijkstra's Algorithm efficiently finds the shortest paths in graphs with non-negative edge weights. It has a time complexity of O((V + E) log V) with a priority queue implementation, where V is the number of vertices and E is the number of edges.
// Accuracy: Dijkstra's Algorithm guarantees correctness when applied to graphs with non-negative edge weights. It computes the shortest paths accurately from the source node to all other nodes in the graph.
// Flexibility: Dijkstra's Algorithm can handle weighted graphs represented as adjacency lists. It traverses the adjacency list efficiently to explore neighboring nodes and update their distances based on the edge weights.
