function startLargerThanTarget(startNode, targetNode) {
  return (
    this.topLevelParentNodes !== null &&
    this.topLevelParentNodes.size === 2 &&
    startNode.width > targetNode.width &&
    startNode.height > targetNode.height
  );
}

// Function to check if a specific node is in the array
function isNodeInArray(node, array) {
  return array.some((n) => n.x === node.x && n.y === node.y);
}

function isReflectedPoint(neighbour) {
  return this.reflectedPoints.some((point) => neighbour.x === point.x && neighbour.y === point.y);
}

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
// !this.startLargerThanTarget(startNodeDetails, targetNodeDetails) is absolutely necessary for Scenario 3 & 4 to work
if (!this.startLargerThanTarget(startNodeDetails, targetNodeDetails) && neighbourIsCentroidOfExisitngPath) {
  tentativeGScore += 100;
}

// make the reflected point of the centroid be the neighbour that is chosen first.
// => decrease priority of reflected point on path a little such that it is chosen before a centroid
// Explaination: doing this such that the outer path (which is more aesthetic in most cases) is chosen first
const neighbourReflectedPoint = this.isReflectedPoint(neighbour);
if (neighbourReflectedPoint) {
  // console.log("reflected neighbour: ", neighbour);
  tentativeGScore -= 50;
}

if (oppositePathExists) {
  const centroidOnOppositPath = this.isNodeInArray(neighbour, existingPath);
  if (neighbourIsCentroidOfExisitngPath && centroidOnOppositPath) {
    // increase the gScore of this neighbour, to make it not be chosen (as it is already part of the opposite path)
    gScore[JSON.stringify(neighbour)] = tentativeGScore - 100;
  }
  // else if (!centroidOnOppositPath && neighbourIsCentroidOfExisitngPath) {
  //   // console.log("neighbour:", neighbour, "gScore-neighbour: ", gScore[JSON.stringify(neighbour)]);
  //   console.log("this should be our chosen centroid:", neighbour);
  // }
}

function startLargerThanTarget(startNode, targetNode) {
  return (
    this.topLevelParentNodes !== null &&
    this.topLevelParentNodes.size === 2 &&
    startNode.width > targetNode.width &&
    startNode.height > targetNode.height
  );
}

// Function to check if a specific node is in the array
function isNodeInArray(node, array) {
  return array.some((n) => n.x === node.x && n.y === node.y);
}

function isNeighbourMidpoint(neighbour, start, target, nodeMidpoints) {
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

function isReflectedPoint(neighbour) {
  return this.reflectedPoints.some((point) => neighbour.x === point.x && neighbour.y === point.y);
}
