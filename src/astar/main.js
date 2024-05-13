import Delaunator from "https://cdn.skypack.dev/delaunator@5.0.0";
import { Bezier } from "./bezier-js/bezier.js";
import { Grid } from "./grid.js";
import { aStar } from "./graphSearch.js";

window.addEventListener("load", () => {
  const canvas = document.querySelector("#grid");
  // define what context we are working in
  /** @type {CanvasRenderingContext2D} */
  const ctx = canvas.getContext("2d");
  // customizable: canvas.height, canvas.width, gridHeight, gridWidth
  canvas.height = 1000;
  canvas.width = 1000;

  const gridHeight = 20; // cells on y-axis
  const gridWidth = 20; // cells on x-axis

  const cellDim = canvas.height / gridHeight;

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
  triangleCanvas.height = 1000;
  triangleCanvas.width = 1000;

  // draw triangle mesh
  document.getElementById("triangleMeshBtn").addEventListener("click", () => drawDelaunayTriangles(ctx2));

  // hide triangle mesh
  document.getElementById("hideMeshBtn").addEventListener("click", () => hideMesh(ctx2));

  // get state and edge configuration from input
  document.getElementById("updateButton").addEventListener("click", updateGraph);

  // call path finding meethod
  document.getElementById("findPathBtn").addEventListener("click", findPathDual);

  ///// popup button config
  const popupBtn = document.getElementById("popupBtn");
  const popup = document.getElementById("popup");
  const closeBtn = document.getElementById("closeBtn");

  // When the button is clicked, show the popup
  popupBtn.addEventListener("click", function () {
    popup.style.display = "block";
  });

  // When the close button is clicked, hide the popup
  closeBtn.addEventListener("click", function () {
    popup.style.display = "none";
  });

  // When the user clicks anywhere outside of the popup, close it
  window.addEventListener("click", function (event) {
    if (event.target === popup) {
      popup.style.display = "none";
    }
  });
  ///// end of popup button config

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

  function hideMesh(ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function findPathDual() {
    // Retrieve data to Define the connections between nodes (edges) based on rules:
    // Rules:
    // #1 nodeMidpoints are only connected to the nearest centroids
    // #2 centroids are connected to nearest nodeMidpoints as well as other nearest centroids
    // #3 edges between centroids cannot cross other edges

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
    // Reflect point along line: https://gist.github.com/balint42/b99934b2a6990a53e14b // method is from this source -> REFERENCE in Paper
    // use reflect method
    // go over convex hull -> as those are the edges and vertices I need to respect
    // adding a node for each of the outer edges of the convex hull should in principal take care of the scenarios for the outside nodes
    // such that the scenario where you can go back and forth in between two close-by nodes is always possible

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

    // implement an adjacency list as a set of key-value pairs
    // where the key is the node (base-node)
    // and the value is an array represnting what other nodes the base-node is connected to
    // I will use a Map() for this, because it has additional useful API methods
    // and it behaves more like a dictionary or hashMap (found in other languages)

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

    edgeConnections.forEach((edge, index) => {
      // FIXME: following is a maybe feature, not priority
      // const connection = JSON.stringify(edge);
      // if (duplicateEdgesSet.has(connection)) {
      //   // check if the same path exists twice -> draw 2 parallel edges and need to specify docking points for these edges
      //   console.log("duplicate edge -> draw straight line from start to end", edge);
      //   // TODO: muss mir was überlegen, wie ich die docking points für die parallelen edges spezifiziere
      //   // weil die ja nicht einfach nur parallel sind, sondern auch noch an den nodes andocken müssen
      //   // und andere edges schon evenuell da sind
      // }

      // run astar.findPath() for each edge connection (user input)
      let path = astar.findPath(edge.startNode.midpoint, edge.targetNode.midpoint, edge.startNode, edge.targetNode); // pass in the midpoint, as those represent nodes in the adjacency list (graph)
      paths.push(path);
    });

    // 9. POST-PROCESSING (Rendering the edges as bezier curves)
    // drawing on ctx (and not ctx2)

    paths.forEach((path, index) => {
      if (path.length <= 3) {
        // TODO: check if same path exists twice from nodeA to nodeB && if exactly 1 path
        // exists from nodeB to nodeA => them edges: A->B are beziers, edge B->A is straight line

        // Calculate intersection point of bezier curve and node to get startPos and endPos of bezier curve
        //-> EXPLAIN THIS: I am using the original points of each path as the control points of the bezier curve
        // but then calculating intersection of the node and that potential bezier curve to get the start and end position of the new bezier curve
        // which goes from the intersection point of the node and the bezier curve to the intersection point of the node and the bezier curve
        // to draw the shorter more aesthetically pleasing bezier curves
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
          drawArrowhead(ctx, path, endPos);
        }
      } else {
        // 1. aproach: This code creates a smooth path through a set of points using midpoints for smooth transitions and each point as a control point for quadratic Bézier curves, ending with a straight line to the last point.
        /* GPT: "The calculation of midpoints in the code you're referring to is used for drawing smooth curves through a series of points using quadratic Bézier curves.
        // A quadratic Bézier curve requires three points: a start point, an end point, and a control point. The curve starts at the start point, ends at the end point, and is pulled towards the control point, creating a smooth curve.
        // In this code, each point in the path array (except for the first and last) is used as a control point for a Bézier curve. The start point of each curve is the previous point in the array, and the end point is the midpoint between the control point and the next point in the array. This creates a series of curves that smoothly pass through each point in the path.
        Calculating the midpoints allows the curve to smoothly transition from one point to the next, as the end point of one curve is the start point of the next. This ensures that the curve doesn't have any sharp corners and instead forms a smooth, continuous line." */

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
        drawArrowhead(ctx, path.slice(-3), endPos);

        // 2. approach: Catmol-Rom Splines from p5.js
        // Splines describe a transformation of control points
        // Given some control points, you use a spline, to generate curves
        // One can think of splines as curve generators, that make certain promises
        // about continuity in the curve Joins, and how it treats the input control points
        // Catmull-Rom splines are a type of spline that is very useful for computer graphics
        // because they are easy to use and generate nice curves

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

        // Draw straight line segment for comparison; to visualize used control points
        // ctx.beginPath();
        // ctx.moveTo(path[0].x, path[0].y); // Move to the starting point
        // for (let i = 1; i < path.length; i++) {
        //   ctx.strokeStyle = "purple";
        //   ctx.lineTo(path[i].x, path[i].y); // Draw a line to the ending point

        //   ctx.stroke();
        // }
      }
    });
  }

  // calculate intersection point of bezier curve and node
  function intersectionCurveAndNode(path) {
    if (path.length === 3) {
      // TODO: find corresponding point in nodeCoordinates array to get width and height of them
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

  function getIntersection(x1, x2, c1, c2, y1, y2, line) {
    // x1, x2, c1, c2, y1, y2 = points of bezier curve
    //https://github.com/Pomax/bezierjs
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

  function isMidpointAboveAndBelowPoints(point, point1, point2) {
    const minY = Math.min(point1.y, point2.y);
    const maxY = Math.max(point1.y, point2.y);
    const midpoint = (minY + maxY) / 2;
    return point.y === midpoint && point1.x === point2.x;
  }

  function drawArrowhead(ctx, path, endPos, arrowLength = 10) {
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

  function createHierarchyMap() {
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

  // Function to calculate Euclidean distance between two nodes
  function calculateDistance(node1, node2) {
    const dx = node2.x - node1.x;
    const dy = node2.y - node1.y;
    return Math.floor(Math.sqrt(dx * dx + dy * dy));
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

  function processNodeInput(nodeInput) {
    nodeCoordinates = nodeInput.split(";").map((entry) => {
      // x = x-axis coordinate of the rectangle's starting point, in pixels. (top left corner of node) // y = y-axis coordinate of the rectangle's starting point, in pixels. (top left corner of node) // width = rectangle's width. Positive values are to the right, and negative to the left. // height = rectangle's height. Positive values are down, and negative are up.
      let [x, y, width, height] = entry.split(",").map(Number);
      if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
        throw new Error("Invalid node input");
      }
      const midpoint = { x: x + width / 2, y: y + height / 2 };
      nodeMidpoints.push(midpoint);
      return { x, y, width, height, midpoint: midpoint };
    });
  }

  function checkConnections(edgeConnections) {
    let nodes = new Set();

    edgeConnections.forEach((edge) => {
      nodes.add(JSON.stringify(edge.startNode));
      nodes.add(JSON.stringify(edge.targetNode));
    });

    // Outputs true if there are only two distinct nodes involved in the connections, false otherwise
    return nodes.size === 2;
  }

  function processNodeInputForTriangulation(nodeInput) {
    // only have to do this for a connection from a smaller node to a larger node

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

  function drawLine(ctx, start, end) {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

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

    // return { x: offsetX, y: offsetY };
    return { midpointX: offsetX, midpointY: offsetY };
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
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    nodes.forEach((node) => drawNode(node));

    // edges.forEach((edge, index) => {}); // draw edges
  }

  function drawNode(node) {
    const { x, y, width, height } = node;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, [10]);
    ctx.stroke();
  }

  function getRandomColor() {
    const color = "#" + Math.floor(Math.random() * 16777215).toString(16); // 16777215 is equivalent to FFFFFF in hexadecimal
    return color;
  }

  function calculateCentroid(x1, y1, x2, y2, x3, y3) {
    const Cx = (x1 + x2 + x3) / 3;
    const Cy = (y1 + y2 + y3) / 3;
    // Example usage:
    // const centroid = calculateCentroid(0, 0, 3, 0, 0, 4);
    // console.log("Centroid:", centroid); // Output: { Cx: 1, Cy: 1.333 }
    return { x: Cx, y: Cy };
  }
});
