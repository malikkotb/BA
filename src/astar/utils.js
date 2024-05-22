import { Bezier } from "./bezier-js/bezier.js";

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

function compareNodes(node1, node2) {
  return node1.x === node2.x && node1.y === node2.y;
}

function isNodeInArray(node, array) {
  return array.some((n) => n.x === node.x && n.y === node.y);
}

function isEdgeOnTriangle(edge, triangle) {
  for (let i = 0; i < 3; i++) {
    const nextIndex = (i + 1) % 3;
    const triangleEdge = [triangle[i], triangle[nextIndex]];
    // Check if both nodes of the edge are equal to both nodes of the triangle edge
    if (
      (compareNodes(edge[0], triangleEdge[0]) && compareNodes(edge[1], triangleEdge[1])) ||
      (compareNodes(edge[0], triangleEdge[1]) && compareNodes(edge[1], triangleEdge[0]))
    ) {
      return true; // Edge is also on the triangle
    }
  }
  return false; // Edge is not on the triangle
}

function getRandomColor() {
  const color = "#" + Math.floor(Math.random() * 16777215).toString(16); // 16777215 is equivalent to FFFFFF in hexadecimal
  return color;
}

function calculateCentroid(x1, y1, x2, y2, x3, y3) {
  const Cx = (x1 + x2 + x3) / 3;
  const Cy = (y1 + y2 + y3) / 3;
  return { x: Cx, y: Cy };
}

/**
 * @brief Reflect point p along line through points p0 and p1
 *
 * @author Balint Morvai <balint@morvai.de>
 * @license http://en.wikipedia.org/wiki/MIT_License MIT License
 * @param p point to reflect
 * @param p0 first point for reflection line
 * @param p1 second point for reflection line
 * @return object
 */
function reflect(p, p0, p1) {
  let dx, dy, a, b, x, y;

  dx = p1.x - p0.x;
  dy = p1.y - p0.y;
  a = (dx * dx - dy * dy) / (dx * dx + dy * dy);
  b = (2 * dx * dy) / (dx * dx + dy * dy);
  x = Math.round(a * (p.x - p0.x) + b * (p.y - p0.y) + p0.x);
  y = Math.round(b * (p.x - p0.x) - a * (p.y - p0.y) + p0.y);

  return { x: x, y: y };
}

function getIntersection(x1, x2, c1, c2, y1, y2, line) {
  // x1, x2, c1, c2, y1, y2 = points of bezier curve
  // https://github.com/Pomax/bezierjs
  const intersectionPoints = [];

  let slantLine = line;
  //add invisible slant to vertical lines
  if (slantLine.p1.x === slantLine.p2.x && slantLine.p1.y !== slantLine.p2.y) {
    slantLine.p1.x += 0.001; //  1e-8;
  }

  const bezierCurve = new Bezier(x1, x2, c1, c2, y1, y2);
  const intersections = bezierCurve.lineIntersects(slantLine);
  if (intersections.length > 0) {
    for (let e = 0; e < intersections.length; e++) {
      let n = intersections[e],
        t = bezierCurve.get(n);
      intersectionPoints.push(t);
    }
    // console.log("Intersection Points:", intersectionPoints);
  }

  return intersectionPoints[0];
}

function getLineLineIntersection(line1Start, line1End, line2Start, line2End) {
  const { x: x1, y: y1 } = line1Start;
  const { x: x2, y: y2 } = line1End;
  const { x: x3, y: y3 } = line2Start;
  const { x: x4, y: y4 } = line2End;

  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (denominator === 0) {
    return null; // The lines are parallel or coincident
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    const intersectionX = x1 + t * (x2 - x1);
    const intersectionY = y1 + t * (y2 - y1);
    return { x: intersectionX, y: intersectionY };
  }

  return null; // The lines do not intersect within the line segments
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

// returns sides of a node: { top, bottom, left, right}
function calculateNodeSides(width, height, topLeftCorner) {
  // Calculate coordinates of each side
  const top = {
    p1: { x: topLeftCorner.x, y: topLeftCorner.y },
    p2: { x: topLeftCorner.x + width, y: topLeftCorner.y },
  };

  const bottom = {
    p1: { x: topLeftCorner.x, y: topLeftCorner.y + height },
    p2: { x: topLeftCorner.x + width, y: topLeftCorner.y + height },
  };

  const left = {
    p1: { x: topLeftCorner.x, y: topLeftCorner.y },
    p2: { x: topLeftCorner.x, y: topLeftCorner.y + height },
  };

  const right = {
    p1: { x: topLeftCorner.x + width, y: topLeftCorner.y },
    p2: { x: topLeftCorner.x + width, y: topLeftCorner.y + height },
  };
  return { top, bottom, left, right };
}

function isMidpointAboveAndBelowPoints(point, point1, point2) {
  const minY = Math.min(point1.y, point2.y);
  const maxY = Math.max(point1.y, point2.y);
  const midpoint = (minY + maxY) / 2;
  return point.y === midpoint && point1.x === point2.x;
}

// Function to check if two triangles are neighboring
function areTrianglesNeighboring(triangleA, triangleB) {
  // Iterate over each edge of triangleA
  for (let i = 0; i < 3; i++) {
    const edge = [triangleA.triangleVertices[i], triangleA.triangleVertices[(i + 1) % 3]]; // Get current edge
    // Check if triangleB shares the same edge
    if (
      triangleB.triangleVertices.some((vertex) => edge[0].x === vertex.x && edge[0].y === vertex.y) &&
      triangleB.triangleVertices.some((vertex) => edge[1].x === vertex.x && edge[1].y === vertex.y)
    ) {
      return true; // Found a common edge, triangles are neighbors
    }
  }
  return false; // No common edge found
}

function hideMesh(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Function to find neighboring triangles for each triangle
function findNeighborsForMesh(mesh) {
  const neighbors = [];
  const numTriangles = mesh.length;
  // Iterate over each triangle
  for (let i = 0; i < numTriangles; i++) {
    const currentTriangle = mesh[i];
    const currentTriangleNeighbors = [currentTriangle]; // Include the current triangle itself
    // Check against every other triangle
    for (let j = 0; j < numTriangles; j++) {
      if (i !== j && areTrianglesNeighboring(currentTriangle, mesh[j])) {
        currentTriangleNeighbors.push(mesh[j]); // Add neighboring triangle object
      }
    }
    neighbors.push(currentTriangleNeighbors); // Add neighbors of current triangle to the list
  }
  return neighbors;
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

function checkConnections(edgeConnections) {
  let nodes = new Set();

  edgeConnections.forEach((edge) => {
    nodes.add(JSON.stringify(edge.startNode));
    nodes.add(JSON.stringify(edge.targetNode));
  });

  // returns true if there are only two distinct nodes involved in the connections, false otherwise
  return nodes.size === 2;
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

export {
  drawArrowheadLine, // edge (arrow) rendering
  drawArrowhead, // edge (arrow) rendering
  checkConnections, // for delaunay!
  createHierarchyMap,
  findNeighborsForMesh, // delaunay
  hideMesh, // delaunay
  areTrianglesNeighboring, // delaunay
  isMidpointAboveAndBelowPoints,
  calculateNodeSides, // intersection
  calculateDistance,
  findDuplicates,
  getLineLineIntersection, // intersection
  getIntersection, // intersection
  reflect, // delaunay
  calculateCentroid, // delaunay
  getRandomColor, // delaunay
  isEdgeOnTriangle, // delaunay
  getMidpointWithOffset,
  isNodeInsideBoundary,
  compareNodes,
  isNodeInArray,
};
