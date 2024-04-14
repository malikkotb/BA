// TODO: reference the implementation in paper: https://github.com/luciopaiva/heapify
import { MinQueue } from "https://unpkg.com/heapify/heapify.mjs";
export class aStar {
  // Edge Weights: Represent the Euclidean distance between connected nodes.
  // g-Cost: Cumulative distance traveled from the start node along the explored path.
  // h-Cost: Estimated distance from the current node to the goal node, based on Euclidean distance.
  // f-Cost: Total estimated cost of reaching the goal node via the current node, sum of g-cost and h-cost.

  findPaths(adjacencyList, start, target) {
    // TODO: change openSet from arrray to priority queue with min-heap implemenation
    const openSet = new MinQueue(64, [], [], Array, Uint32Array);
    const closedSet = [];
    let startNode = { node: start, connections: adjacencyList.get(start.midpoint) };
    openSet.push(startNode, startNode.node.gCost);
    console.log(openSet.peekPriority())
    // nodes defined like this: { node: start.midpoint, connections: adjacencyList.get(start.midpoint) }

    // openSet.push(1, 10); // pushes the key and a priority (= f_cost)




    while (openSet.size > 0) {
      let current = openSet[0]; // current node in openSet wit lowest f_cost
      console.log(current);
      openSet;

      return;
    }
  }

  // Function to calculate Euclidean distance between two nodes
  calculateDistance(node1, node2) {
    const dx = node2.x - node1.x;
    const dy = node2.y - node1.y;
    return Math.floor(Math.sqrt(dx * dx + dy * dy));
  }
}
