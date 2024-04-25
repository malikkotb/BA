import { PriorityQueue } from "./pq.js";
export class aStar {
  // Edge Weights: Represent the Euclidean distance between connected nodes.
  // g-Cost: Cumulative distance traveled from the start node along the explored path.
  // h-Cost: Estimated distance from the current node to the goal node, based on Euclidean distance.
  // f-Cost: Total estimated cost of reaching the goal node via the current node, sum of g-cost and h-cost.

  constructor(adjacencyList, nodeMidoints, reflectedPoints, centroids) {
    this.adjacencyList = adjacencyList;
    this.nodeMidoints = nodeMidoints;
    this.reflectedPoints = reflectedPoints;
    this.centroids = centroids;
    this.centroidsOnPaths = [];
    this.paths = [];
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

    // TODO: check if they have same start and end node (just flipped) so opposite
    // -> adjust tentativeGScore
    let existingPath = null;
    let oppositePathExists = false;
    this.paths.forEach((path) => {
      if (this.areEndPoints(start, target, path)) {
        existingPath = path;
        oppositePathExists = true;
      }
    });
    // console.log("existiingPath", existingPath);

    console.log("adjacency: ", this.adjacencyList);

    while (!openSet.isEmpty()) {
      console.log(JSON.parse(JSON.stringify(openSet.items)));
      let current = openSet.dequeue(); // get current node in openSet wit lowest f_cost
      // get neighbours/(connected nodes) of a node: this.adjacencyList.get(current);
      if (current.x === target.x && current.y === target.y) {
        return this.reconstructPath(cameFrom, target);
      }

      for (let neighbour of this.adjacencyList.get(current)) {
        // this.calculateDistance(neighbour, current) represents the edge weight from neighbour to currnet
        let tentativeGScore = gScore[JSON.stringify(current)] + this.calculateDistance(neighbour, current);

        // check if a neighbour (THAT IS NOT THE TARGETNODE AND NOT THE STARTNODE) is a nodeMidpoint -> then set edge weight to that neighbour high; as we dont want to go through another node
        const neighbourIsMidpointAndNotTarget = this.isNeighbourMidpoint(neighbour, start, target, this.nodeMidoints);
        if (neighbourIsMidpointAndNotTarget) {
          tentativeGScore += 1000;
        }

        // check if neighbour is a centroid that's already part of another path
        // to avoid crossing edges
        // this is a desirable condition but not necessary as there will inevitably be some edge crossing
        // especially with larger graphs and many connections

        const neighbourIsCentroidOfExisitngPath = this.isNodeInArray(neighbour, this.centroidsOnPaths);
        if (neighbourIsCentroidOfExisitngPath) {
          tentativeGScore += 100;
        }

        //TODO: some kind of check when drawing edges between child nodes inside the same parent node

        // make the reflected point of the centroid be the neighbour that is chosen first.
        // => decrease priority of reflected point on path a little such that it is chosen before a centroid
        // Explaination: doing this such that the outer path (which is more aesthetic in most cases) is chosen first
        const neighbourReflectedPoint = this.isReflectedPoint(neighbour);
        if (neighbourReflectedPoint) {
          console.log("reflected neighbour: ", neighbour);
          tentativeGScore -= 50;
        }

        if (oppositePathExists) {
          const centroidOnOppositPath = this.isNodeInArray(neighbour, existingPath);
          if (neighbourIsCentroidOfExisitngPath && centroidOnOppositPath) {
            // console.log("we dont want this niehgbour...", neighbour);
            // increase the gScore of this neighbour, to make it not be chosen (as it is already part of the opposite path)
            gScore[JSON.stringify(neighbour)] = tentativeGScore - 100;
          }
          // else if (!centroidOnOppositPath && neighbourIsCentroidOfExisitngPath) {
          //   // console.log("neighbour:", neighbour, "gScore-neighbour: ", gScore[JSON.stringify(neighbour)]);
          //   console.log("this should be our chosen centroid:", neighbour);
          // }
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
    this.paths.push(totalPath);
    return totalPath;
  }

  // Function to check if a specific node is in the array
  isNodeInArray(node, array) {
    return array.some((n) => n.x === node.x && n.y === node.y);
  }

  isNeighbourMidpoint(neighbour, start, target, nodeMidpoints) {
    return nodeMidpoints.some((nodeMidpoint) => {
      return (
        neighbour.x !== start.x &&
        neighbour.y !== start.y &&
        neighbour.x !== target.x &&
        neighbour.y !== target.y &&
        neighbour.x === nodeMidpoint.x &&
        neighbour.y === nodeMidpoint.y
      );
    });
  }

  pointExists(array, x, y) {
    return array.some((point) => point.x === x && point.y === y);
  }

  isReflectedPoint(neighbour) {
    return this.reflectedPoints.some(point => neighbour.x === point.x && neighbour.y === point.y)
  }

  areEndPoints(point1, point2, pathArray) {
    const firstPoint = pathArray[0];
    const lastPoint = pathArray[pathArray.length - 1];
    return (
      // (point1.x === firstPoint.x &&
      //   point1.y === firstPoint.y &&
      //   point2.x === lastPoint.x &&
      //   point2.y === lastPoint.y) ||
      point1.x === lastPoint.x && point1.y === lastPoint.y && point2.x === firstPoint.x && point2.y === firstPoint.y
    );
  }

  // Function to calculate Euclidean distance between two nodes
  calculateDistance(node1, node2) {
    const dx = node2.x - node1.x;
    const dy = node2.y - node1.y;
    return Math.floor(Math.sqrt(dx * dx + dy * dy));
  }
}
