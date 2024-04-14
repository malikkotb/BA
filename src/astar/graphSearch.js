export class aStar {
  // Edge Weights: Represent the Euclidean distance between connected nodes.
  // g-Cost: Cumulative distance traveled from the start node along the explored path.
  // h-Cost: Estimated distance from the current node to the goal node, based on Euclidean distance.
  // f-Cost: Total estimated cost of reaching the goal node via the current node, sum of g-cost and h-cost.

  findPaths(adjacencyList, start, target) {
    const openSet = [];
    // TODO: change openSet from arrray to priority queue with min-heap implemenation
    // https://medium.com/@adityakashyap_36551/priority-queue-in-javascript-binary-heap-076d0d38703f#:~:text=In%20JavaScript%2C%20there%20is%20no,to%20use%20a%20binary%20heap.
    const closedSet = [];
    let startNode = { node: start.midpoint, connectioins: adjacencyList.get(start.midpoint) };
    openSet.push(startNode);

    // get connected nodes for a node in openSet: adjacencyList.get(node)
    console.log(startNode);

    // while (this.openSet.length > 0) {
    //   // let current = // current node in openSet wit lowest f_cost
    // }
  }

  // Function to calculate Euclidean distance between two nodes
  calculateDistance(node1, node2) {
    const dx = node2.x - node1.x;
    const dy = node2.y - node1.y;
    return Math.floor(Math.sqrt(dx * dx + dy * dy));
  }
}
