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
