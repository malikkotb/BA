import { PriorityQueue } from "./pq.js";
export class aStar {
  // Edge Weights: Represent the Euclidean distance between connected nodes.
  // g-Cost: Cumulative distance traveled from the start node along the explored path.
  // h-Cost: Estimated distance from the current node to the goal node, based on Euclidean distance.
  // f-Cost: Total estimated cost of reaching the goal node via the current node, sum of g-cost and h-cost.

  constructor(adjacencyList, nodeMidoints) {
    this.adjacencyList = adjacencyList;
    this.nodeMidoints = nodeMidoints;
    this.centroidsOnPaths = [];
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

        // check if neighbour is a centroid that's already part of another path
        // to avoid crossong edges
        // this is a desirable condition but not necessary as there will inevitably be some edge crossing
        // especially with larger graphs and many connections
        const neighbourIsCentroidOfExisitngPath = this.isNodeInArray(neighbour, this.centroidsOnPaths);
        if (neighbourIsCentroidOfExisitngPath) {
          tentativeGScore += 100;
        }


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
          tentativeGScore += 1000;
        }

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
    this.centroidsOnPaths.push(...totalPath.slice(1, -1));
    return totalPath;
  }

  // Function to check if a specific node is in the array
  isNodeInArray(node, array) {
    return array.some((n) => n.x === node.x && n.y === node.y);
  }

  // Function to calculate Euclidean distance between two nodes
  // use as heuristic
  calculateDistance(node1, node2) {
    const dx = node2.x - node1.x;
    const dy = node2.y - node1.y;
    return Math.floor(Math.sqrt(dx * dx + dy * dy));
  }
}
