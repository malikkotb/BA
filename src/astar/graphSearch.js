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

    const cameFrom = {};
    const gScore = {};
    const fScore = {};

    

    adjacencyList.forEach((neighbors, node) => {
      gScore[JSON.stringify(node)] = Infinity;
      fScore[JSON.stringify(node)] = Infinity;
    })

    
    gScore[JSON.stringify(start)] = 0;
    fScore[JSON.stringify(start)] = this.calculateDistance(start, target);

    console.log("");

    while (!openSet.isEmpty()) {
      let current = openSet.dequeue(); // get current node in openSet wit lowest f_cost

      // get neighbours/(connected nodes) of a node: adjacencyList.get(current);
      if (current.x === target.x && current.y === target.y) {
        console.log("path found");
        // return this.retracePath(cameFrom, target);
        return this.retracePath(start, target);
      }

      for (let neighbor of adjacencyList.get(current)) {
        console.log("neighbour: ", neighbor);
        const tentativeGScore = gScore[JSON.stringify(current)] + this.calculateDistance(neighbor, current);
        console.log("gScore[JSON.stringify(current)]",gScore[JSON.stringify(current)]);
        console.log("fScore[JSON.stringify(current)]",fScore[JSON.stringify(current)]);
        console.log("hCost", this.calculateDistance(neighbor, current));
        console.log("tentativeGscore",tentativeGScore);
        const fScoreNeighbour = fScore[JSON.stringify(neighbor)];

        console.log(fScoreNeighbour);
        console.log("");

        if (tentativeGScore < gScore[JSON.stringify(neighbor)]) {
          cameFrom[neighbor] = current;
          gScore[JSON.stringify(neighbor)] = tentativeGScore;
          fScore[JSON.stringify(neighbor)] = gScore[JSON.stringify(neighbor)] + this.calculateDistance(neighbor, target);
          if (!openSet.items.some((item) => item.item.x === neighbor.x && item.item.y === neighbor.y)) {
            openSet.enqueue(neighbor, fScore[JSON.stringify(neighbor)]);
          }
        }
      }

      console.log("No path found");
      return null;
    }
  }

  reconstructPath(cameFrom, current) {
    const totalPath = [current];
    while (cameFrom[JSON.stringify(current)]) {
      current = cameFrom[JSON.stringify(current)];
      totalPath.unshift(current);
    }
    return totalPath;
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
