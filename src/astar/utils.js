function getMidpointWithOffset(point1, point2, offset) {
  let midpointX = (point1.x + point2.x) / 2;
  let midpointY = (point1.y + point2.y) / 2;

  console.log(midpointX, midpointY);

  // Calculate the direction of the line
  let dx = point2.x - point1.x;
  let dy = point2.y - point1.y;

  // Normalize the direction and rotate it by 90 degrees to get the perpendicular direction
  let magnitude = Math.sqrt(dx * dx + dy * dy);
  let directionX = dy / magnitude;
  let directionY = -dx / magnitude;

  // Scale the direction by the offset and add it to the midpoint
  let offsetX = midpointX + directionX * offset;
  let offsetY = midpointY + directionY * offset;

  return { midpointX: offsetX, midpointY: offsetY };
}
//Needed to establish hierarchies
function isNodeInsideBoundary(node1, node2) {
  const topLeftInside = node1.x >= node2.x && node1.y >= node2.y;
  const topRightInside = node1.x + node1.width <= node2.x + node2.width && node1.y >= node2.y;
  const bottomLeftInside = node1.x >= node2.x && node1.y + node1.height <= node2.y + node2.height;
  const bottomRightInside =
    node1.x + node1.width <= node2.x + node2.width && node1.y + node1.height <= node2.y + node2.height;

  return topLeftInside && topRightInside && bottomLeftInside && bottomRightInside;
}

function isNodeInArray(node, array) {
  return array.some((n) => n.x === node.x && n.y === node.y);
}

function findDuplicates(array) {
  const seen = new Set();
  const duplicates = new Set();

  for (let item of array) {
    if (seen.has(JSON.stringify(item))) {
      duplicates.add(JSON.stringify(item));
    } else {
      seen.add(JSON.stringify(item));
    }
  }

  return duplicates;
}

// Function to calculate Euclidean distance between two nodes
function calculateDistance(node1, node2) {
  const dx = node2.x - node1.x;
  const dy = node2.y - node1.y;
  return Math.floor(Math.sqrt(dx * dx + dy * dy));
}

function isMidpointAboveAndBelowPoints(point, point1, point2) {
  const minY = Math.min(point1.y, point2.y);
  const maxY = Math.max(point1.y, point2.y);
  const midpoint = (minY + maxY) / 2;
  return point.y === midpoint && point1.x === point2.x;
}

function createHierarchyMap(nodeCoordinates) {
  const hierarchyMap = new Map();

  // Iterate over each node
  for (const node of nodeCoordinates) {
    const parentNode = node;
    const childNodes = [];

    // Compare with every other node
    for (const otherNode of nodeCoordinates) {
      if (node !== otherNode) {
        const isInside = isNodeInsideBoundary(otherNode, node);
        if (isInside) {
          childNodes.push(otherNode);
        }
      }
    }

    // Store the list of child nodes in the hierarchy map
    hierarchyMap.set(parentNode, childNodes);
  }

  // loop through hierarchyMap and remove all child nodes to only have top level nodes (no parents) => filter top level nodes
  const topLevelNodes = new Map(hierarchyMap);

  for (const [parentNode, childNodes] of hierarchyMap) {
    for (const childNode of childNodes) {
      if (topLevelNodes.has(childNode)) {
        topLevelNodes.delete(childNode);
      }
    }
  }

  return topLevelNodes;
  // return hierarchyMap;
}

function drawArrowhead(topLevelParentNodes, ctx, path, endPos, arrowLength = 10) {
  // Assuming path is an array of points
  const controlPoint = path[1];

  // Calculate the angle of the line segment formed by the last two points
  let angle = Math.atan2(endPos[1] - controlPoint.y, endPos[0] - controlPoint.x);

  let keys = null;
  if (topLevelParentNodes !== null) {
    keys = Array.from(topLevelParentNodes.keys());
  }

  // this is for edge cases: Scenario: Fig. 3 and 4.
  // So when there is a connection from a smaller node to a larger node and there is only 2 top-level nodes.
  if (topLevelParentNodes !== null && topLevelParentNodes.size === 2) {
    let differentSizeNodes = false;
    for (let i = 0; i < keys.length - 1; i++) {
      let currentKey = keys[i];
      let nextKey = keys[i + 1];
      if (currentKey.width !== nextKey.width && currentKey.height !== nextKey.height) {
        differentSizeNodes = true;
        // console.log("differentSizeNodes");
      }
    }
    if (differentSizeNodes) {
      if (angle > 0) angle += 0.1;
      else angle -= 0.1;
    }
  }

  // Calculate the coordinates of the points of the arrowhead
  const arrowPoint1 = {
    x: endPos[0] - arrowLength * Math.cos(angle - Math.PI / 6),
    y: endPos[1] - arrowLength * Math.sin(angle - Math.PI / 6),
  };
  const arrowPoint2 = {
    x: endPos[0] - arrowLength * Math.cos(angle + Math.PI / 6),
    y: endPos[1] - arrowLength * Math.sin(angle + Math.PI / 6),
  };

  ctx.beginPath();
  ctx.moveTo(endPos[0], endPos[1]);
  ctx.lineTo(arrowPoint1.x, arrowPoint1.y);
  ctx.lineTo(arrowPoint2.x, arrowPoint2.y);
  ctx.closePath();
  ctx.fillStyle = "black";
  ctx.fill();
}

function drawArrowheadLine(ctx, fromX, fromY, toX, toY, size = 10) {
  // Calculate angle of the line
  const angle = Math.atan2(toY - fromY, toX - fromX);

  // Calculate points for arrowhead
  const p1x = toX - size * Math.cos(angle - Math.PI / 6);
  const p1y = toY - size * Math.sin(angle - Math.PI / 6);
  const p2x = toX - size * Math.cos(angle + Math.PI / 6);
  const p2y = toY - size * Math.sin(angle + Math.PI / 6);

  // Draw the arrowhead lines
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(p1x, p1y);
  ctx.lineTo(p2x, p2y);
  ctx.closePath(); // Close the path to form a triangle

  // Fill the arrowhead
  ctx.fillStyle = "#000"; // Set arrowhead fill color
  ctx.fill();
}

function getNode(point, nodeCoordinates) {
  if (!point) return null;
  let midPoint = null;
  nodeCoordinates.some((node) => {
    if (node.midpoint.x === point.x && node.midpoint.y === point.y) {
      midPoint = node;
    }
  });
  return midPoint;
}

export {
  drawArrowheadLine, // edge (arrow) rendering
  drawArrowhead, // edge (arrow) rendering
  createHierarchyMap,
  isMidpointAboveAndBelowPoints,
  calculateDistance,
  findDuplicates,
  getMidpointWithOffset,
  isNodeInsideBoundary,
  isNodeInArray,
  getNode,
};
