import Delaunator from "https://cdn.skypack.dev/delaunator@5.0.0";
import { Bezier } from "./bezier-js/bezier.js";

import { Grid } from "./grid.js";
import { aStar } from "./graphSearch.js";
// import Delaunator from "delaunator";
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

  let graphEdges = []; // list of edges from which I will extract the adjacency list
  let triangleMesh = []; // list of objects with all important triangle nodes for one triangle and their respective coordinates (includes: vertices (corner points) and centroids of a single triangle)
  let nodeMidpoints = [];
  let centroids = [];
  let convexHull = []; // convexHull of nodes
  let astar = null;

  let grid = null;
  let paths = []; // shortest paths

  const { atan2, cos, sin, sqrt } = Math;

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

  // New approach OVERVIEW:
  // Retrieve the data
  //
  // Represent data as nodes and centroids as a connected graph data structure, adjacency list (REPRESENT AS GRAPH)
  //
  // Find shortest path on that graph (with Dijkstra or A* idk)
  //
  // Then perform Post processing
  // start with the simple connections between 2 nodes, where only a quadratic bezier curve is needed
  // and where the path only goes through one control-point/centroid
  //
  // and then after that works use a series of either quadratic or bezier curves (for obstacles aka other nodes in the path of the edge)
  // to find the path going through multiple control-points/centroid

  function findPathDual() {
    // Retrieve data to Define the connections between nodes (edges) based on rules:
    // Rules:
    // #1 nodeMidpoints are only connected to the nearest centroids (how maybe by checking the delauney triangles that go out of a nodeMidoint and determining them that way)
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

    // TODO: use reflect method
    // go over convex hull maybe ? as those are the edges and vertices I need to respect
    // adding a node for each of the outher edges of the convex hull should in principal take care of the scenarios for the outside nodes
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

    // 4. TODO: Add additional points and edges for dual-grid-graph that are on the outside of the convex hull -> to make travelling around all nodes on the outside possible
    //    TODO: maybe add additonal points on the dual-grid-graph, that lie on the edges of the triangles (generated through delauney triangluation)
    //    => to have more control-points for the bezier splines

    // 5. Draw edges for visualization
    graphEdges.forEach((edge) => {
      drawLine(ctx2, edge[0], edge[1]);
    });

    // TODO:
    // 6. Intermediate step which is performed every execution

    // check if there is already a path along certain points.
    // ( -> need to store all previously rendered paths )
    // and if there is, then add edge weights along that path perhaps ??
    // I can perhaps add weights to the edges for edges that are crossing another edge or sth. similar like that to influence the path.

    // TODO:==> add these calculated weights when setting 'weight' property
    // of an added node

    // 7. Represent the graph (nodes & edges) as an adjacency list

    // implement an adjacency list as a set of key-value pairs
    // where the key is the node (base-node)
    // and the value is an array represnting what other nodes the base-node is connected to
    // I will use a Map() for this, because it has additional useful API methods
    // and it behaves more like a dictionary or hashMap (found in other languages)

    const adjacencyList = new Map();
    [...nodeMidpoints, ...centroids, ...reflectedPoints].forEach((node) => {
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
        // .push({
        //   node: keyConnectedNode,
        //   weight: calculateDistance(keyBaseNode, keyConnectedNode),
        // });
        // do inverse of line above to update the connectedNode also
        adjacencyList.get(keyConnectedNode).push(keyBaseNode);
        // .push({ node: keyBaseNode, weight: calculateDistance(keyConnectedNode, keyBaseNode)});
      }
    });

    // 8. Sort edges in edgeConnections array based on euclidean distances
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

    // 9. Perform pathfinding (graph search algorithm) on adjacency list
    astar = new aStar(adjacencyList, nodeMidpoints);

    // run astar.findPath() for each edge connection (user input)
    edgeConnections.forEach((edge) => {
      let path = astar.findPath(edge.startNode.midpoint, edge.targetNode.midpoint); // pass in the midpoint, as those represent nodes in the adjacency list (graph)
      paths.push(path);
    });

    // TODO: 10. POST-PROCESSING (Rendering the edges as bezier curves)
    // drawing on ctx (and not ctx2)
    paths.forEach((path, index) => {
      // TODO: compute what side I should render the starting-point of the bezier curve from
      // and determine the position on that side by the set standards (and then calculate using dimensions of the node)

      if (path.length <= 3) {
        // TODO: check if the same path exists twice -> draw 2 parallel lines

        // TODO: check if same path exists twice from nodeA to nodeB && if exactly 1 path
        // exists from nodeB to nodeA => them edges: A->B are beziers, edge B->A is straight line

        // TODO: adjust start and end point of edge => calculate intersection point of bezier curve and node
        const { startPos, endPos } = intersectionBezierAndNode(path);
        // scenario: "connect two nodes directly via quadratic bezier curve"

        // ctx.beginPath();
        // ctx.moveTo(startPos[0], startPos[1]);
        // ctx.quadraticCurveTo(path[1].x, path[1].y, endPos[0], endPos[1]);
        // ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        ctx.quadraticCurveTo(path[1].x, path[1].y, path[2].x, path[2].y);
        ctx.stroke();

        // DRAWING ARROWHEAD
        // Assuming path is an array of points
        // const controlPoint = path[1];
        // const endPoint = path[2];

        // // Calculate the angle of the line segment formed by the last two points
        // const angle = Math.atan2(endPoint.y - controlPoint.y, endPoint.x - controlPoint.x);

        // // Length of the arrowhead
        // const arrowLength = 10;

        // // Calculate the coordinates of the points of the arrowhead
        // const arrowPoint1 = {
        //   x: endPoint.x - arrowLength * Math.cos(angle - Math.PI / 6),
        //   y: endPoint.y - arrowLength * Math.sin(angle - Math.PI / 6),
        // };
        // const arrowPoint2 = {
        //   x: endPoint.x - arrowLength * Math.cos(angle + Math.PI / 6),
        //   y: endPoint.y - arrowLength * Math.sin(angle + Math.PI / 6),
        // };

        // // Draw the arrowhead
        // ctx.beginPath();
        // ctx.moveTo(endPoint.x, endPoint.y);
        // ctx.lineTo(arrowPoint1.x, arrowPoint1.y);
        // ctx.lineTo(arrowPoint2.x, arrowPoint2.y);
        // ctx.closePath();
        // ctx.fill();
      } else {
        // TODO: if path length > 3, use bezier splines and connect them accordingly for
        // a segment of 3 (or in some cases 2 (at the end)) points along the path

        // draw a segment for each section of the path
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y); // Move to the starting point
        for (let i = 1; i < path.length; i++) {
          ctx.strokeStyle = "purple";
          ctx.lineTo(path[i].x, path[i].y); // Draw a line to the ending point

          ctx.lineWidth = 3; // Set the width of the edge
          ctx.stroke();
        }
      }
    });
  }

  // calculate intersection point of bezier curve and node
  function intersectionBezierAndNode(path) {
    if (path.length <= 3) {
      // TODO: find corresponding point in nodeCoordinates array to get width and height of them
      const startNode = getNode(path[0]);
      const endNode = getNode(path[2]);

      let startPos = null;
      let endPos = null;

      // Explaination: use startNode and endNode & their respecive width & height
      // to calculate what angle the bezier is going out of (from the midpoint)
      // => to know which side it of the node it is intersecting with
      // and then use that side as the line to calculate intersection with
      // the intersection represents the point where the bzezier curve should dock

      // start-, control- and end- point of bezier curve
      const points = [path[0].x, path[0].y, path[1].x, path[1].y, path[2].x, path[2].y];
      console.log("points on path:", points);
      // sides of startNode
      // const { topSideStartNode, bottomSideStartNode, leftSideStartNode, rightSideStartNode } = calculateNodeSides(
      const {
        top: topSideStartNode,
        bottom: bottomSideStartNode,
        left: leftSideStartNode,
        right: rightSideStartNode,
      } = calculateNodeSides(startNode.width, startNode.height, {
        x: startNode.x,
        y: startNode.y,
      });
      console.log("");
      console.log("startNode", startNode);
      const intersectStartTop = getIntersection(...points, topSideStartNode);
      const intersectStartBottom = getIntersection(...points, bottomSideStartNode);
      const intersectStartLeft = getIntersection(...points, leftSideStartNode);
      const intersectStartRight = getIntersection(...points, rightSideStartNode);

      if (intersectStartTop) {
        // console.log("top side", intersectStartTop);
        startPos = [intersectStartTop.x, intersectStartTop.y];
      }
      if (intersectStartBottom) {
        // console.log("bottom side", intersectStartBottom);
        startPos = [intersectStartBottom.x, intersectStartBottom.y];
      }
      if (intersectStartLeft) {
        // console.log("left side", intersectStartLeft);
        startPos = [intersectStartLeft.x, intersectStartLeft.y];
      }
      if (intersectStartRight) {
        // console.log("right side", intersectStartRight);
        startPos = [intersectStartRight.x, intersectStartRight.y];
      }

      console.log("startPos: ", startPos);

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

      console.log("endNode", endNode);
      const intersectEndTop = getIntersection(...points, topSideEndNode);
      const intersectEndBottom = getIntersection(...points, bottomSideEndNode);
      const intersectEndLeft = getIntersection(...points, leftSideEndNode);
      const intersectEndRight = getIntersection(...points, rightSideEndNode);

      if (intersectEndTop) {
        // console.log("top side", intersectEndTop);
        endPos = [intersectEndTop.x, intersectEndTop.y];
      }
      if (intersectEndBottom) {
        // console.log("bottom side", intersectEndBottom);
        endPos = [intersectEndBottom.x, intersectEndBottom.y];
      }
      if (intersectEndLeft) {
        // console.log("left side", intersectEndLeft);
        endPos = [intersectEndLeft.x, intersectEndLeft.y];
      }
      if (intersectEndRight) {
        // console.log("right side", intersectEndRight);
        endPos = [intersectEndRight.x, intersectEndRight.y];
      }

      console.log("endPos: ", endPos);

      // THERE IS SOME WEIRD BUG, THAT THE GETINTERSECTION METHOD LOGS TWO POINTS & one of them is completely wrong
      // & that one gets chosen sometimes and then pointOnLine(returns null)

      return { startPos, endPos };
    }
  }

  function getIntersection(x1, x2, c1, c2, y1, y2, line) {
    // x1, x2 = start point of curve
    // c1, c2 = control point of curve
    // y1, y2 = end point of curve
    //TODO: reference in Paper: https://github.com/Pomax/bezierjs
    // const curve = new Bezier(x1, x2, c1, c2, y1, y2);
    // console.log("line", line);
    // console.log(curve);
    // console.log("curve intersects", curve.intersects(line));
    const intersectionPoints = [];

    let slantLine = line;
    //add invisible slant to vertical lines
    if (slantLine.p1.x === slantLine.p2.x && slantLine.p1.y !== slantLine.p2.y) {
      slantLine.p1.x += 0.001//  1e-8;
    }

    const bezierCurve = new Bezier(x1, x2, c1, c2, y1, y2);
    console.log(x1, x2, c1, c2, y1, y2);
    const intersections = bezierCurve.lineIntersects(slantLine);
    if (intersections.length > 0) {
      for (let e = 0; e < intersections.length; e++) {
        let n = intersections[e],
          t = bezierCurve.get(n);
        intersectionPoints.push(t);
      }
    }
    console.log("Intersection Points:", intersectionPoints);

    return intersectionPoints;
    // return curve.intersects(line).map((t) => curve.get(t))[0] ?? null;

    // var draw = function () {
    //   this.drawSkeleton(curve);
    //   this.drawCurve(curve);
    //   var line = { p1: { x: 0, y: 175 }, p2: { x: 200, y: 25 } };
    //   this.setColor("red");
    //   this.drawLine(line.p1, line.p2);
    //   this.setColor("black");
    //   curve.intersects(line).forEach((t) => this.drawPoint(curve.get(t)));
    // };

    // // Destructure the points array
    // const [[x1, y1], [x2, y2], [x3, y3]] = points;
    // const roots = getRoots(points, line);
    // const coordForRoot = (t) => {
    //   const mt = 1 - t;
    //   return [x1 * mt ** 2 + 2 * x2 * t * mt + x3 * t ** 2, y1 * mt ** 2 + 2 * y2 * t * mt + y3 * t ** 2];
    // };
    // const coordinates = roots.map((t) => coordForRoot(t).map((v) => v.toFixed(2)));
    // console.log("");
    // console.log("line", line, "coordinates: ", coordinates);
    // if (
    //   pointOnLine(
    //     coordinates[0]?.map((str) => parseFloat(str)),
    //     line[0],
    //     line[1]
    //   )
    // ) {
    //   console.log("True, coordinates", coordinates, "\ncoordinatres[0]:", coordinates[0], "\nline:", line);
    //   return coordinates[0].map((str) => parseFloat(str));
    // } else {
    //   console.log("Nope, points: ", points, "coords: ", coordinates, "\n line:", line);
    //   return undefined;
    // }
  }

  function pointOnLine(point, lineStart, lineEnd) {
    if (!point) {
      return false;
    }
    const [x, y] = point;
    const [x1, y1] = lineStart;
    const [x2, y2] = lineEnd;
    return (
      (x - x1) * (y2 - y1) === (y - y1) * (x2 - x1) &&
      Math.min(x1, x2) <= x &&
      x <= Math.max(x1, x2) &&
      Math.min(y1, y2) <= y &&
      y <= Math.max(y1, y2)
    );
  }

  function getNode(point) {
    let midPoint = null;
    nodeCoordinates.some((node) => {
      if (node.midpoint.x === point.x && node.midpoint.y === point.y) {
        midPoint = node;
      }
    });
    return midPoint;
  }

  function compareNodes(node1, node2) {
    return node1.x === node2.x && node1.y === node2.y;
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

  function printMap(map) {
    map.forEach((value, key) => {
      // Convert float properties to integers
      const intKey = { x: Math.floor(key.x), y: Math.floor(key.y) };
      const intValue = value.map((obj) => ({ x: Math.floor(obj.x), y: Math.floor(obj.y) }));

      console.log(`${JSON.stringify(intKey)} => ${JSON.stringify(intValue)}`);
    });
  }

  // returns sides of a node: { top, bottom, left, right}
  function calculateNodeSides(width, height, topLeftCorner) {
    // Calculate coordinates of each side
    var line = { p1: { x: 0, y: 175 }, p2: { x: 200, y: 25 } };
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

  function specifyDockingPoints(startNode, targetNode) {
    // this is part of post-processing
    // TODO: determine starting coordinates of the edge for the startingNode and determine end coordinates for the endNode
    // need to set standards, like on corners or in the middle of one side of the node

    // TODO:
    // get property of node to know: how many edges are going out of this node
    // then set standards for what cells of a node to choose depending
    // on the length of the side of the particular node

    console.log(startNode, targetNode);

    // return { startPos, targetPos };
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

  function processNodeInputForTriangulation(nodeInput) {
    return nodeInput.split(";").map((entry) => {
      let [x, y, width, height] = entry.split(",").map(Number);
      if (isNaN(x) || isNaN(y)) {
        throw new Error("Invalid node input");
      }
      return [x + width / 2, y + height / 2]; // get center/midpoint of the node (rectangle/square shape)
    });
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
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    nodes.forEach((node) => drawNode(node));

    // edges.forEach((edge, index) => {}); // draw edges
  }

  function drawNode(node) {
    const { x, y, width, height } = node;
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, [15]);
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
