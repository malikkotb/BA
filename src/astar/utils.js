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

export {calculateCentroid, getRandomColor, isEdgeOnTriangle, getMidpointWithOffset, isNodeInsideBoundary, compareNodes, isNodeInArray} 