import Delaunator from "https://cdn.skypack.dev/delaunator@5.0.0";
import { Grid } from "./grid.js";
import { aStar } from "./graphSearch.js";
import {
  checkConnections,
  findNeighborsForMesh,
  hideMesh,
  reflect,
  getRandomColor,
  compareNodes,
  calculateCentroid,
  isEdgeOnTriangle,
} from "./delaunay.js";
import {
  getMidpointWithOffset,
  isNodeInArray,
  findDuplicates,
  calculateDistance,
  createHierarchyMap,
  isMidpointAboveAndBelowPoints,
  drawArrowhead,
  drawArrowheadLine,
  getNode,
} from "./utils.js";

import { calculateNodeSides, getLineLineIntersection, getIntersection } from "./intersection.js";

window.addEventListener("load", () => {
  const canvas = document.querySelector("#grid");
  // define what context we are working in
  /** @type {CanvasRenderingContext2D} */
  const ctx = canvas.getContext("2d");
  // customizable: canvas.height, canvas.width, gridHeight, gridWidth
  canvas.height = 1400;
  canvas.width = 1400;

  const gridHeight = 28; // cells on y-axis
  const gridWidth = 28; // cells on x-axis

  // Draw additional x-axis labels
  for (var i = 100; i <= 1400; i += 100) {
    ctx.fillText(i.toString(), i, 15);
  }

  // Draw additional y-axis labels
  for (var i = 1400; i >= 0; i -= 100) {
    ctx.fillText(i.toString(), 5, i);
  }

  let nodeCoordinates = [];
  let edgeConnections = [];

  let nodeInput = document.getElementById("nodeInput").value;
  let edgeInput = document.getElementById("edgeInput").value;
  let topLevelParentNodes = null;

  let graphEdges = []; // list of edges from which I will extract the adjacency list
  let triangleMesh = []; // list of objects with all important triangle nodes for one triangle and their respective coordinates (includes: vertices (corner points) and centroids of a single triangle)
  let nodeMidpoints = [];
  let centroids = [];
  let convexHull = []; // convexHull of nodes
  let additionalPointsForEdgeCases = [];
  let astar = null;

  let grid = null;
  let paths = []; // shortest paths

  // Triangulation Canvas Layer
  const triangleCanvas = document.querySelector("#layer1");
  const ctx2 = triangleCanvas.getContext("2d");
  triangleCanvas.height = 1400;
  triangleCanvas.width = 1400;

  // draw triangle mesh
  document.getElementById("triangleMeshBtn").addEventListener("click", () => drawDelaunayTriangles(ctx2));

  // hide triangle mesh
  document.getElementById("hideMeshBtn").addEventListener("click", () => hideMesh(ctx2, triangleCanvas));

  // get state and edge configuration from input
  document.getElementById("updateButton").addEventListener("click", updateGraph);

  // call path finding method
  document.getElementById("findPathBtn").addEventListener("click", findPathDual);

  function updateGraph() {
    nodeInput = document.getElementById("nodeInput").value;
    edgeInput = document.getElementById("edgeInput").value;
    if (nodeInput) processNodeInput(nodeInput);
    if (edgeInput) applyUserConnections(nodeCoordinates, edgeInput); // get Edge-Connection configs from user input

    grid = new Grid(ctx, gridWidth, gridHeight, nodeCoordinates, canvas.height); // Create the grid
    redrawGraph(nodeCoordinates); // draw nodes
  }

  function drawDelaunayTriangles(ctx) {
    nodeInput = document.getElementById("nodeInput").value;
    edgeInput = document.getElementById("edgeInput").value;
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

  // Main function to draw edges using dual grid and pathfinding
  function findPathDual() {
    // 1. Connect nodeMidpoints to centroids:
    // triangle-Vertices are all nodeMidpoints, so I can connect the triangle vertices of a single trianlge to the centroid of that trianlge
    triangleMesh.forEach((triangle) => {
      triangle.triangleVertices.forEach((vertex) => {
        graphEdges.push([vertex, triangle.centroid]);
      });
    });

    // 2. Connect centroids to neighbouring (& only neighbouring) centroids
    // => edges between centroids can only be between centroids of exactly neighbouring dealuney triangles
    // neighbouring triangles could be determined if they share an edge (the 2 vertices of that edge), because then they have to be neighbouring in that case

    // Find neighbors for each triangle in the mesh
    const triangleNeighbors = findNeighborsForMesh(triangleMesh);
    triangleNeighbors.forEach((neighbors, index) => {
      // console.log(`Neighbors of Triangle ${index}:`, neighbors);
      neighbors.slice(1).forEach((neighbor) => {
        const edge = [neighbors[0].centroid, neighbor.centroid];
        // this is the same as the edge-array but only objects swapped around, so it describes the same edge
        const flippedEdge = [neighbor.centroid, neighbors[0].centroid];

        const isAlreadyIncluded = graphEdges.some((subArray) => {
          return subArray.every((val, index) => {
            const objToCheck = flippedEdge[index];
            return val.x === objToCheck.x && val.y === objToCheck.y;
          });
        });

        // don't add duplicate centroid edges
        if (!isAlreadyIncluded) {
          // push the centroid edges
          graphEdges.push(edge);
        }
      });
    });

    // 3. Reflect centroids between nodes on convex hull on the line connecting two nodes on convex hull

    // get convex-hull edges
    let convexEdges = [];
    for (let i = 0; i < convexHull.length; i++) {
      if (i === convexHull.length - 1) {
        convexEdges.push([
          { x: convexHull[i][0], y: convexHull[i][1] },
          { x: convexHull[0][0], y: convexHull[0][1] },
        ]);
      } else {
        convexEdges.push([
          { x: convexHull[i][0], y: convexHull[i][1] },
          { x: convexHull[i + 1][0], y: convexHull[i + 1][1] },
        ]);
      }
    }

    // get centroids that need to be reflected
    let pointsToReflect = []; // centroids of delauney triangles that need to be reflected

    convexEdges.forEach((edge) => {
      triangleMesh.forEach((triangle) => {
        if (isEdgeOnTriangle(edge, triangle.triangleVertices)) {
          pointsToReflect.push({ point: triangle.centroid, edge: edge });
        }
      });
    });

    // reflect centroids on convexEdges
    let reflectedPoints = [];
    pointsToReflect.forEach((point) => {
      const p = point.point;
      const p0 = point.edge[0];
      const p1 = point.edge[1];
      const rP = reflect(p, p0, p1); // new reflected Point

      // add 2 new edges for each reflected point: from p0 to new rP, and from rP to p1
      graphEdges.push([p0, rP]);
      graphEdges.push([rP, p1]);
      reflectedPoints.push(rP);

      // draw reflected point on canvas
      const radius = 5;
      ctx2.beginPath();
      ctx2.arc(rP.x, rP.y, radius, 0, Math.PI * 2); // Arc centered at (x, y) with radius
      ctx2.fillStyle = "purple";
      ctx2.fill();
    });

    // 5. Draw edges for visualization
    graphEdges.forEach((edge) => {
      drawLine(ctx2, edge[0], edge[1]);
    });

    // 6. Represent the graph (the dual grid) (nodes & edges) as an adjacency list
    const adjacencyList = new Map();
    [...nodeMidpoints, ...centroids, ...reflectedPoints, ...additionalPointsForEdgeCases].forEach((node) => {
      adjacencyList.set(node, []);
    });

    const keysArray = Array.from(adjacencyList.keys());

    graphEdges.forEach((edge) => {
      // Iterate over the keys of adjacencyList and compare properties
      const keyBaseNode = keysArray.find((key) => compareNodes(edge[0], key));
      const keyConnectedNode = keysArray.find((key) => compareNodes(edge[1], key));
      if (keyBaseNode) {
        // to add an edge (undirected), I need to update the entries for the baseNode and the connectedNode
        adjacencyList.get(keyBaseNode).push(keyConnectedNode);

        // do inverse of line above to update the connectedNode also
        adjacencyList.get(keyConnectedNode).push(keyBaseNode);
      }
    });

    // 7. Sort edges in edgeConnections array based on euclidean distances
    // that are closest together are rendered first
    // ensuring that the scenario: "connect two nodes directly via quadratic bezier curve"
    // is always fulfilled
    edgeConnections.sort((edgeA, edgeB) => {
      // Calculate euclidean distances for each edge
      const euclideanDistA = calculateDistance(edgeA.startNode, edgeA.targetNode);
      const euclideanDistB = calculateDistance(edgeB.startNode, edgeB.targetNode);

      // Compare the euclidean distances and return the comparison result
      return euclideanDistA - euclideanDistB;
    });

    if (topLevelParentNodes && topLevelParentNodes.size === 2) {
      // For Scenario Fig. 3 and Fig. 4
      let index = edgeConnections.findIndex(
        (edge) => edge.startNode.width > edge.targetNode.width && edge.startNode.height > edge.targetNode.height
      );

      if (index !== -1) {
        let result = edgeConnections.splice(index, 1)[0];
        edgeConnections.push(result);
        // console.log("target connection: ", result); // Outputs the first edge where the startNode is larger in width and height than the targetNode
      }
    }

    // 8. Perform pathfinding (graph search algorithm) on adjacency list
    astar = new aStar(adjacencyList, nodeMidpoints, reflectedPoints, centroids, topLevelParentNodes);

    const duplicateEdgesSet = findDuplicates(edgeConnections);
    console.log("duplicateEdges", duplicateEdgesSet);

    edgeConnections.forEach((edge) => {
      // run astar.findPath() for each edge connection (user input)
      let path = astar.findPath(edge.startNode.midpoint, edge.targetNode.midpoint, edge.startNode, edge.targetNode); // pass in the midpoint, as those represent nodes in the adjacency list (graph)
      paths.push(path);
    });

    // 9. POST-PROCESSING (Rendering the edges as bezier curves)
    // drawing on ctx (and not ctx2)

    paths.forEach((path, index) => {
      if (path.length <= 3) {
        // Calculate intersection point of bezier curve and node to get startPos and endPos of bezier curve
        const { startPos, endPos } = intersectionCurveAndNode(path);
        // scenario: "connect two nodes directly via quadratic bezier curve"

        const startNode = getNode(path[0]);
        const targetNode = getNode(path[2]);

        // EDGE CASE:
        if (startNode.width > targetNode.width && startNode.height > targetNode.height) {
          // Scenario: "larger node to smaller node" -> draw straight line to middle of the nodes

          // straight line from intersection points of previous bezier curve:
          // ctx.beginPath();
          // ctx.moveTo(startPos[0], startPos[1]);
          // ctx.lineTo(endPos[0], endPos[1]);
          // ctx.stroke();

          // Straight line directly from the middle of the larger node to the middle of the smaller node -> This is required in almost all scenarios in the 80s Statechart paper

          // use startPos[0] and endPos[0] for x-coordinates of start and end points of the straight line
          // use middle of height of the respecitve nodes for y-coordinates of the start and end points of the line
          const startPosX = startPos[0];
          const startPosY = startNode.midpoint.y;
          const endPosX = endPos[0];
          const endPosY = targetNode.midpoint.y;

          ctx.beginPath();
          ctx.moveTo(startPosX, startPosY);
          ctx.lineTo(endPosX, endPosY);
          ctx.stroke();

          drawArrowheadLine(ctx, startPosX, startPosY, endPosX, endPosY);
        } else {
          ctx.beginPath();
          ctx.moveTo(startPos[0], startPos[1]);
          ctx.quadraticCurveTo(path[1].x, path[1].y, endPos[0], endPos[1]);
          ctx.stroke();
          drawArrowhead(topLevelParentNodes, ctx, path, endPos);
        }
      } else {
        // 1. aproach: This code creates a smooth path through a set of points using midpoints for smooth transitions and each point as a control point for quadratic Bézier curves, ending with a straight line to the last point.

        // EDGE CASE: approach to make the path simpler when connecting two nodes inside a parent Node -> Scenario Fig. 2
        if (path.length === 5 && isMidpointAboveAndBelowPoints(path[2], path[1], path[3])) {
          // Remove middle points of path with indices 1, 2, and 3 and create a new element at that point
          const minY = Math.min(path[1].y, path[3].y);
          const maxY = Math.max(path[1].y, path[3].y);
          const midpoint = (minY + maxY) / 2;

          path.splice(1, 3, { x: path[1].x, y: midpoint });
        }

        ctx.beginPath();
        // calculate docking point for the first bezier curve, which goes out of the startNode of the path
        const startPos = intersectionCurveAndNode([path[0], path[1], path[2]]).startPos;
        ctx.moveTo(startPos[0], startPos[1]);
        for (let i = 1; i < path.length - 1; i++) {
          // calculates the coordinates of the midpoint between the current point and the next point.
          const xc = (path[i].x + path[i + 1].x) / 2;
          const yc = (path[i].y + path[i + 1].y) / 2;
          // The quadratic Bézier curve starts at the current point in the path,
          // uses the current point as a control point, and ends at the midpoint between the current point and the next point.
          // This creates a smooth curve that passes through each point in the path array.
          ctx.quadraticCurveTo(path[i].x, path[i].y, xc, yc);
        }

        // const positions = intersectionCurveAndNode([secondLastPoint, path[path.length - 1]]);
        const endPos = intersectionCurveAndNode([path[path.length - 2], path[path.length - 1]]).endPos;
        ctx.lineTo(endPos[0], endPos[1]); // connect last two points in the path with line that ends at intersection with last node
        ctx.stroke();
        drawArrowhead(topLevelParentNodes, ctx, path.slice(-3), endPos);

        // 2. approach: Catmol-Rom Splines from p5.js
        const sketch = (p) => {
          p.setup = () => {
            let cnv = p.createCanvas(1200, 1200);
            const canvasElement = document.getElementById("layer1");
            const canvasPosition = canvasElement.getBoundingClientRect();
            const canvasX = canvasPosition.left;
            const canvasY = canvasPosition.top;
            cnv.style("z-index", "10");
            cnv.style("background-color", "transparent");
            cnv.position(canvasX, canvasY);
            p.noLoop();
          };

          p.draw = () => {
            p.background(255, 0.0); // set alpha-value of p5 canvas to 0

            p.noFill();
            p.beginShape();
            p.curveVertex(Math.floor(startPos[0]), Math.floor(startPos[1]));
            p.curveVertex(Math.floor(startPos[0]), Math.floor(startPos[1]));
            for (let point of path.slice(1, path.length - 1)) {
              p.curveVertex(Math.floor(point.x), Math.floor(point.y));
            }
            p.curveVertex(Math.floor(endPos[0]), Math.floor(endPos[1]));
            p.curveVertex(Math.floor(endPos[0]), Math.floor(endPos[1]));
            p.endShape();
          };
        };

        // new p5(sketch, "canvas-container"); // catmull rom spline
      }
    });
  }

  // // calculate intersection point of bezier curve and node
  function intersectionCurveAndNode(path) {
    if (path.length === 3) {
      const startNode = getNode(path[0]);
      const endNode = getNode(path[2]);

      let startPos = null;
      let endPos = null;

      // Explaination: use startNode and endNode & their respecive width & height
      // to calculate what angle the bezier is going out of (from the midpoint)
      // => to know which side of the node it is intersecting with
      // and then use that side as the line to calculate intersection with.

      // The intersection point represents the point where the Bézier curve should dock

      // start-, control- and end- point of bezier curve
      const points = [path[0].x, path[0].y, path[1].x, path[1].y, path[2].x, path[2].y];
      if (startNode) {
        // returns the coordinates for the sides of the startNode
        const {
          top: topSideStartNode,
          bottom: bottomSideStartNode,
          left: leftSideStartNode,
          right: rightSideStartNode,
        } = calculateNodeSides(startNode.width, startNode.height, {
          x: startNode.x,
          y: startNode.y,
        });

        const sideStartNodes = [topSideStartNode, bottomSideStartNode, leftSideStartNode, rightSideStartNode];

        sideStartNodes.forEach((node) => {
          const intersection = getIntersection(...points, node);
          if (intersection) {
            // set start-Position for the new bezier curve, that touches the startNode
            startPos = [intersection.x, intersection.y];
          }
        });
      }

      if (endNode) {
        // returns the coordinates for the sides of the endNode
        const {
          top: topSideEndNode,
          bottom: bottomSideEndNode,
          left: leftSideEndNode,
          right: rightSideEndNode,
        } = calculateNodeSides(endNode.width, endNode.height, {
          x: endNode.x,
          y: endNode.y,
        });

        const sideEndNodes = [topSideEndNode, bottomSideEndNode, leftSideEndNode, rightSideEndNode];

        sideEndNodes.forEach((node) => {
          const intersection = getIntersection(...points, node);
          if (intersection) {
            // set end-Position for the new bezier curve, that touches the endNode
            endPos = [intersection.x, intersection.y];
          }
        });
      }

      // For paths of length >3 / so for series of bezier curves
      // for connected bezier curves
      if (startNode === null && endNode === null) {
        return { startPos: Object.values(path[0]), endPos: Object.values(path[2]) };
      } else if (startNode === null) {
        return { startPos: Object.values(path[0]), endPos: endPos };
      } else if (endNode === null) {
        return { startPos: startPos, endPos: Object.values(path[2]) };
      }

      return { startPos, endPos };
    } else if (path.length === 2) {
      // get intersection point of staright line (bezier is a straight line in this case, bc there are only 2 points for a
      // potential bezier cruve) and node

      const endNode = getNode(path[1]);

      // sides of endNode
      const {
        top: topSideEndNode,
        bottom: bottomSideEndNode,
        left: leftSideEndNode,
        right: rightSideEndNode,
      } = calculateNodeSides(endNode.width, endNode.height, {
        x: endNode.x,
        y: endNode.y,
      });

      let endPos = null;

      // console.log("endNode", endNode);

      const sideEndNodes = [topSideEndNode, bottomSideEndNode, leftSideEndNode, rightSideEndNode];

      // console.log("line of curve", path[0], path[1]);
      sideEndNodes.forEach((node) => {
        // console.log("sideNode: ", node);
        const intersection = getLineLineIntersection(path[0], path[1], node.p1, node.p2);
        if (intersection) {
          endPos = [intersection.x, intersection.y];
        }
      });

      // console.log("endPos of bezier: ", endPos);

      return { startPos: Object.values(path[0]), endPos: endPos };
    }
  }

  function getNode(point) {
    if (!point) return null;
    let midPoint = null;
    nodeCoordinates.some((node) => {
      if (node.midpoint.x === point.x && node.midpoint.y === point.y) {
        midPoint = node;
      }
    });
    return midPoint;
  }

  function processNodeInput(nodeInput) {
    nodeCoordinates = nodeInput.split(";").map((entry) => {
      let [x, y, width, height] = entry.split(",").map(Number);
      if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
        throw new Error("Invalid node input");
      }
      const midpoint = { x: x + width / 2, y: y + height / 2 };
      nodeMidpoints.push(midpoint);
      return { x, y, width, height, midpoint: midpoint };
    });
  }

  function processNodeInputForTriangulation(nodeInput) {
    console.log(checkConnections(edgeConnections));
    if (nodeInput.split(";").length === 2 || checkConnections(edgeConnections)) {
      // or if there is only connections between two nodes
      // so check if from the given edge input connections there are only ones between the same nodes
      // so either going from start to target or from target to start (but they are the same)
      topLevelParentNodes = createHierarchyMap(nodeCoordinates);
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

  function drawLine(ctx, start, end) {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Function to parse user input and apply connections
  function applyUserConnections(nodes, edgeInput) {
    // Split the user input by semicolons to separate individual connections
    let connections = edgeInput.split(";").map((connection) => connection.trim());

    // Iterate over each connection
    connections.forEach((connection) => {
      // Extract x and y coordinates of the two nodes from the connection string
      let [x1, y1, x2, y2] = connection.match(/\d+/g).map(Number);

      // Find the nodes in the nodes array using their coordinates
      let startNode = nodes.find((node) => node.x === x1 && node.y === y1);
      let targetNode = nodes.find((node) => node.x === x2 && node.y === y2);
      // Check if both nodes are found
      if (startNode && targetNode) {
        // Apply logic to connect nodes (e.g., draw a line between them)
        console.log("Connecting nodes:", startNode, "and", targetNode);
        edgeConnections.push({ startNode, targetNode });
      } else {
        // Display an error message if nodes cannot be found
        console.log("Invalid node coordinates:", connection);
      }
    });
  }

  // Function to draw the graph
  function redrawGraph(nodes) {
    nodes.forEach((node) => drawNode(node));
  }

  function drawNode(node) {
    const { x, y, width, height } = node;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, [10]);
    ctx.stroke();
  }
});
