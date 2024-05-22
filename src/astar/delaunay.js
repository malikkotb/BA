// delaunay.js
import Delaunator from "https://cdn.skypack.dev/delaunator@5.0.0";


function drawDelaunayTriangles(ctx) {
    nodeInput = document.getElementById("nodeInput").value;
    let points = processNodeInputForTriangulation(nodeInput);
    const delaunay = Delaunator.from(points);
    let triangles = delaunay.triangles;
    let triangleCoordinates = [];
    for (let i = 0; i < triangles.length; i += 3) {
      triangleCoordinates.push([points[triangles[i]], points[triangles[i + 1]], points[triangles[i + 2]]]);
    }

    // draw points for nodeMidpoints
    nodeMidpoints.forEach((node) => {
      const radius = 5;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2); // Arc centered at (x, y) with radius
      ctx.fillStyle = "red"; // Fill color
      ctx.fill(); // Fill the circle
    });

    ctx.globalAlpha = 0.5;
    triangleCoordinates.forEach((t) => {
      ctx.beginPath();
      ctx.moveTo(t[0][0], t[0][1]);
      ctx.lineTo(t[1][0], t[1][1]);
      ctx.lineTo(t[2][0], t[2][1]);
      ctx.closePath();
      ctx.fillStyle = getRandomColor();
      ctx.fill();

      const centroid = calculateCentroid(t[0][0], t[0][1], t[1][0], t[1][1], t[2][0], t[2][1]);
      centroids.push(centroid);

      const triangleVertices = [
        { x: t[0][0], y: t[0][1] },
        { x: t[1][0], y: t[1][1] },
        { x: t[2][0], y: t[2][1] },
      ];

      // add triangle vertices and triangle centroids to triangleMesh array
      triangleMesh.push({ centroid: centroid, triangleVertices: triangleVertices });

      const radius = 5;
      ctx.beginPath();
      ctx.arc(centroid.x, centroid.y, radius, 0, Math.PI * 2); // Arc centered at (x, y) with radius
      ctx.fillStyle = "red"; // Fill color
      ctx.fill(); // Fill the circle
    });

    // convex hull of the points
    let hull = delaunay.hull;

    for (let i = 0; i < hull.length; i++) {
      convexHull.push(points[hull[i]]);
    }
    ctx.beginPath();
    ctx.moveTo(convexHull[0][0], convexHull[0][1]);

    convexHull.forEach((h) => {
      ctx.lineTo(h[0], h[1]);
    });
    ctx.closePath();
    ctx.strokeStyle = "red";
    ctx.stroke();
  }


  function processNodeInputForTriangulation(nodeInput) {

    console.log(checkConnections(edgeConnections));
    if (nodeInput.split(";").length === 2 || checkConnections(edgeConnections)) {
      // or if there is only connections between two nodes
      // so check if from the given edge input connections there are only ones between the same nodes
      // so either going from start to target or from target to start (but they are the same)
      topLevelParentNodes = createHierarchyMap();
      console.log("top level nodes", topLevelParentNodes);
    }

    // -> add the extra points to the larger node of the two, so I have enough points for triangulation
    const additionalPoints = [];
    if (topLevelParentNodes && topLevelParentNodes.size === 2) {
      // "both target and start node are top level nodes" -> is fulfilled as there are only two top level nodes
      for (let edge of edgeConnections) {
        const startNode = edge.startNode;
        const targetNode = edge.targetNode;
        if (startNode.width < targetNode.width && startNode.height < targetNode.height) {
          // Scenario Fig. 3 & 4
          // => startNode NEEDS to be the smaller node and targetNode the larger node
          const { x, y, width, height } = targetNode;
          const topLeft = { x, y };
          const topRight = { x: x + width, y };
          const bottomLeft = { x, y: y + height };
          const bottomRight = { x: x + width, y: y + height };

          // add the 4 (or 2 right now) corners of the larger node to the additionalPoints array
          if (
            !isNodeInArray(topRight, additionalPointsForEdgeCases) &&
            !isNodeInArray(bottomRight, additionalPointsForEdgeCases)
          ) {
            additionalPointsForEdgeCases.push(topRight, bottomRight);
            additionalPoints.push([x + width, y], [x + width, y + height]);
          }
        } else if (startNode.width > targetNode.width && startNode.height > targetNode.height) {
          // Scenario Fig. 3 & 4
          // => startNode NEEDS to be the larger node and targetNode the smaller node
          const { x, y, width, height } = startNode;
          const topLeft = { x, y };
          const topRight = { x: x + width, y };
          const bottomLeft = { x, y: y + height };
          const bottomRight = { x: x + width, y: y + height };

          // add the 4 (or 2 right now) corners of the larger node to the additionalPoints array
          if (
            !isNodeInArray(topRight, additionalPointsForEdgeCases) &&
            !isNodeInArray(bottomRight, additionalPointsForEdgeCases)
          ) {
            additionalPointsForEdgeCases.push(topRight, bottomRight);
            additionalPoints.push([x + width, y], [x + width, y + height]);
          }
        } else {
          // Scenario Fig. 5
          // start and target nodes are of same size
          // const { midpointX, midpointY } = getLineMidpoint(startNode.midpoint, targetNode.midpoint);
          const offset = calculateDistance(startNode.midpoint, targetNode.midpoint) / 2;
          console.log("offset", offset);
          const { midpointX, midpointY } = getMidpointWithOffset(startNode.midpoint, targetNode.midpoint, offset);
          console.log(midpointX, midpointY);
          additionalPoints.push([midpointX, midpointY]);
          additionalPointsForEdgeCases.push({ x: midpointX, y: midpointY });
          console.log("fig. 5");
        }
      }
    }

    console.log(additionalPoints);

    const nodeMidpoints = nodeInput.split(";").map((entry) => {
      let [x, y, width, height] = entry.split(",").map(Number);
      if (isNaN(x) || isNaN(y)) {
        throw new Error("Invalid node input");
      }
      return [x + width / 2, y + height / 2]; // get center/midpoint of the node (rectangle/square shape)
    });
    const points = [...nodeMidpoints, ...additionalPoints]; // points for triangulation
    return points;
  }

function hideMesh(ctx) {
  // ... (Implement logic to clear the canvas or hide triangles)
}

export { drawDelaunayTriangles, hideMesh };
