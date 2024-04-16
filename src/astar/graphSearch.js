import { PriorityQueue } from "./pq.js";
export class aStar {
  // Edge Weights: Represent the Euclidean distance between connected nodes.
  // g-Cost: Cumulative distance traveled from the start node along the explored path.
  // h-Cost: Estimated distance from the current node to the goal node, based on Euclidean distance.
  // f-Cost: Total estimated cost of reaching the goal node via the current node, sum of g-cost and h-cost.

  constructor(adjacencyList, nodeMidoints) {
    this.adjacencyList = adjacencyList;
    this.nodeMidoints = nodeMidoints;
  }

  findPath(start, target) {
    // TODO: change openSet from arrray to priority queue with min-heap implemenation
    const openSet = new PriorityQueue();

    // priority is the fCost
    openSet.enqueue(start, 0);

    const cameFrom = {};
    const gScore = {};
    const fScore = {};

    this.adjacencyList.forEach((neighbours, node) => {
      gScore[JSON.stringify(node)] = Infinity;
      fScore[JSON.stringify(node)] = Infinity;
    });

    gScore[JSON.stringify(start)] = 0;
    fScore[JSON.stringify(start)] = this.calculateDistance(start, target);

    while (!openSet.isEmpty()) {
      let current = openSet.dequeue(); // get current node in openSet wit lowest f_cost

      // get neighbours/(connected nodes) of a node: this.adjacencyList.get(current);
      if (current.x === target.x && current.y === target.y) {
        return this.reconstructPath(cameFrom, target);
      }

      for (let neighbour of this.adjacencyList.get(current)) {
        // this.calculateDistance(neighbour, current) represents the edge weight from neighbour to currnet
        let tentativeGScore = gScore[JSON.stringify(current)] + this.calculateDistance(neighbour, current);

        // check if a neighbour (THAT IS NOT THE TARGETNODE AND NOT THE STARTNODE) is a nodeMidpoint -> then set edge weight to that neighbour high; as we dont want to go through another node
        let nodeMidpointNotTargetNotStart = null;
        const neighbourIsMidpointAndNotTarget = this.nodeMidoints.some((nodeMidoint) => {
          nodeMidpointNotTargetNotStart = nodeMidoint;
          return (
            neighbour.x !== start.x &&
            neighbour.y !== start.y &&
            neighbour.x !== target.x &&
            neighbour.y !== target.y &&
            neighbour.x === nodeMidoint.x &&
            neighbour.y === nodeMidoint.y
          );
        });
        if (neighbourIsMidpointAndNotTarget) {
          tentativeGScore += 100;
        }

        // influence the path by simply changing weights of a particular connection:
        // so by adjusting the edge costs
        // if (JSON.stringify(neighbour) === '{"x":300,"y":183.33333333333334}') {
        //   console.log("here");
        //   tentativeGScore += 10;
        // }

        // console.log("neighbour: ", JSON.stringify(neighbour), ", tentativeGscore", tentativeGScore);
        // console.log("");
        if (tentativeGScore < gScore[JSON.stringify(neighbour)]) {
          cameFrom[JSON.stringify(neighbour)] = current;
          gScore[JSON.stringify(neighbour)] = tentativeGScore;
          fScore[JSON.stringify(neighbour)] =
            gScore[JSON.stringify(neighbour)] + this.calculateDistance(neighbour, target);
          if (!openSet.items.some((item) => item.item.x === neighbour.x && item.item.y === neighbour.y)) {
            openSet.enqueue(neighbour, fScore[JSON.stringify(neighbour)]);
          }
        }
      }
    }
    console.log("No path found");
    return null;
  }

  reconstructPath(cameFrom, current) {
    const totalPath = [current];
    while (cameFrom[JSON.stringify(current)]) {
      current = cameFrom[JSON.stringify(current)];
      totalPath.unshift(current);
    }
    return totalPath;
  }

  // Function to calculate Euclidean distance between two nodes
  // use as heuristic
  calculateDistance(node1, node2) {
    const dx = node2.x - node1.x;
    const dy = node2.y - node1.y;
    return Math.floor(Math.sqrt(dx * dx + dy * dy));
  }
}
