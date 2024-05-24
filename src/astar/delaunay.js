// helper functions used for Delaunay triangulation

function checkConnections(edgeConnections) {
  let nodes = new Set();

  edgeConnections.forEach((edge) => {
    nodes.add(JSON.stringify(edge.startNode));
    nodes.add(JSON.stringify(edge.targetNode));
  });

  // returns true if there are only two distinct nodes involved in the connections, false otherwise
  return nodes.size === 2;
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

function hideMesh(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
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

function getRandomColor() {
  const color = "#" + Math.floor(Math.random() * 16777215).toString(16); // 16777215 is equivalent to FFFFFF in hexadecimal
  return color;
}

function calculateCentroid(x1, y1, x2, y2, x3, y3) {
  const Cx = (x1 + x2 + x3) / 3;
  const Cy = (y1 + y2 + y3) / 3;
  return { x: Cx, y: Cy };
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

function compareNodes(node1, node2) {
  return node1.x === node2.x && node1.y === node2.y;
}

export {
  checkConnections,
  findNeighborsForMesh,
  hideMesh,
  areTrianglesNeighboring,
  reflect,
  getRandomColor,
  compareNodes,
  calculateCentroid,
  isEdgeOnTriangle,
};
