import { PriorityQueue } from "./pq.js";
export class aStar {
  // Edge Weights: Represent the Euclidean distance between connected nodes.
  // g-Cost: Cumulative distance traveled from the start node along the explored path.
  // h-Cost: Estimated distance from the current node to the goal node, based on Euclidean distance.
  // f-Cost: Total estimated cost of reaching the goal node via the current node, sum of g-cost and h-cost.

  findPaths(adjacencyList, start, target) {
    // TODO: change openSet from arrray to priority queue with min-heap implemenation
    const openSet = new PriorityQueue();

    // priority is the fCost
    openSet.enqueue(start, 0);

    const parent = {};
    const gScore = {};
    const fScore = {};

    for (let node in adjacencyList) {
      gScore[JSON.stringify(node)] = Infinity;
      fScore[JSON.stringify(node)] = Infinity;
    }

    gScore[JSON.stringify(start)] = 0;
    fScore[JSON.stringify(start)] = this.calculateDistance(start, target);

    while (!openSet.isEmpty()) {
      let current = openSet.dequeue(); // get current node in openSet wit lowest f_cost

      // get connected nodes of a node: adjacencyList.get(current);

      if (current.x === target.x && current.y === target.y) {
        console.log("path found");
        // return this.retracePath(cameFrom, target);
        return this.retracePath(start, target);
      }



      return;
    }
  }

  retracePath() {

  }

  // Function to calculate Euclidean distance between two nodes
  // use as heuristic
  calculateDistance(node1, node2) {
    const dx = node2.x - node1.x;
    const dy = node2.y - node1.y;
    return Math.floor(Math.sqrt(dx * dx + dy * dy));
  }
}
