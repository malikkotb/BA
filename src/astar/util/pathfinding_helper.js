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

function pointExists(array, x, y) {
  return array.some((point) => point.x === x && point.y === y);
}

function isReflectedPoint(neighbour) {
  return this.reflectedPoints.some((point) => neighbour.x === point.x && neighbour.y === point.y);
}
