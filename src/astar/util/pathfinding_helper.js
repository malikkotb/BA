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
