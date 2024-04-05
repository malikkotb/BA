window.addEventListener("load", () => {
  const canvas = document.querySelector("#canvas");
  // define what context we are working in
  /** @type {CanvasRenderingContext2D} */
  const ctx = canvas.getContext("2d");

  // resizing
  canvas.height = 1000; // window.innerHeight;
  canvas.width = 1000; // window.innerWidth;

  // deafult graph nodes and edges
  let nodes = [
    { x: 100, y: 100 },
    { x: 300, y: 300 },
    { x: 500, y: 100 },
  ];
  let edges = [
    [0, 1],
    [1, 2],
  ];

  const radiusX = 30;
  const radiusY = 20;

  // Function to draw nodes as ellipses
  function drawNode(node) {
    ctx.beginPath();
    ctx.ellipse(node.x, node.y, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "red";
    ctx.stroke();

    // draw label
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.label, node.x, node.y);
  }

  // Adjust edge to touch the ellipse
  // TODO: explain this function (how to calculate intersections of node and edge)
  function adjustEdge(node1, node2) {
    let dx = node2.x - node1.x;
    let dy = node2.y - node1.y;
    let angle = Math.atan2(dy, dx);
    let adjustX = Math.cos(angle) * radiusX;
    let adjustY = Math.sin(angle) * radiusY;
    return { x: node1.x + adjustX, y: node1.y + adjustY };
  }

  function drawArrowhead(ctx, x, y, radians) {
    let arrowLength = 10; // Length of the arrow
    let arrowWidth = 4; // Width of the base of the arrow

    ctx.save();
    ctx.beginPath();
    ctx.translate(x, y);
    ctx.rotate(radians);
    ctx.moveTo(0, 0); // tip of arrow
    ctx.lineTo(-arrowWidth, -arrowLength);
    ctx.lineTo(arrowWidth, -arrowLength);
    ctx.closePath();
    ctx.fillStyle = "black";
    ctx.fill();
    ctx.restore();
  }

  // Updated function to draw edges as Quadratic Bezier curves
  function drawEdge(node1, node2, offset, arrowPosition) {
    var adjustedStart = adjustEdge(node1, node2);
    var adjustedEnd = adjustEdge(node2, node1);

    var midX = (adjustedStart.x + adjustedEnd.x) / 2;
    var midY = (adjustedStart.y + adjustedEnd.y) / 2;

    var cp1x = midX;
    var cp1y = midY - offset;

    ctx.beginPath();
    ctx.moveTo(adjustedStart.x, adjustedStart.y);
    ctx.quadraticCurveTo(cp1x, cp1y, adjustedEnd.x, adjustedEnd.y);
    ctx.strokeStyle = "black";
    ctx.stroke();

    // Calculate the angle for the arrowhead
    var angleAtEnd = Math.atan2(adjustedEnd.y - cp1y, adjustedEnd.x - cp1x);
    var angleAtStart = Math.atan2(
      adjustedStart.y - cp1y,
      adjustedStart.x - cp1x
    );

    // Draw arrow at the specified positions
    if (arrowPosition === "start" || arrowPosition === "both") {
      drawArrowhead(
        ctx,
        adjustedStart.x,
        adjustedStart.y,
        angleAtStart - Math.PI / 2
      );
    }
    if (arrowPosition === "end" || arrowPosition === "both") {
      drawArrowhead(
        ctx,
        adjustedEnd.x,
        adjustedEnd.y,
        angleAtEnd - Math.PI / 2
      );
    }
  }

  // 100,850,London; 300,800,Paris; 500,700,Berlin; 500,400,Rome; 200,300,Madrid; 700,200,Athens; 100,200,Lisbon; 700,800,Warsaw
  // 0,1; 1,2; 2,3; 3,4; 4,5; 5,6; 6,7; 0,3; 1,4; 2,5

  function createSlidersForEdges() {
    const sliderContainer = document.getElementById("sliderParent");
    sliderContainer.innerHTML = ""; // Clear existing sliders

    edges.forEach((edge, index) => {
      const slider = document.createElement("input");
      slider.type = "range";
      slider.id = "edgeSlider" + index;
      slider.min = "-1000";
      slider.max = "1000";
      slider.value = "0"; // Default value

      slider.addEventListener("input", redrawGraph);

      sliderContainer.appendChild(slider);
    });
  }

  // Function to redraw the graph
  function redrawGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    nodes.forEach(drawNode);
    edges.forEach((edge, index) => {
      var node1 = nodes[edge[0]];
      var node2 = nodes[edge[1]];

      const slider = document.getElementById("edgeSlider" + index);
      const offset = parseInt(slider.value, 10);
      // drawEdge(node1, node2, offset, "end"); // Change "end" to "start", "both", or other logic as needed
    });
  }

  document
    .getElementById("updateButton")
    .addEventListener("click", updateGraph);

  // Simple node configration: 100,100; 200,150; 300,100; 400,200
  // this would be: 4 nodes with corresponding (x,y) coordinates

  // Simple edge configuration: 0,1; 1,2; 2,3
  // represents 3 edges, an edge from node 0 to node 1, from node 1 to node 2, and from node 2 to node 3.

  function updateGraph() {
    let nodeInput = document.getElementById("nodeInput").value;
    // let edgeInput = document.getElementById("edgeInput").value;

    nodes = nodeInput.split(";").map((entry) => {
      let [x, y, label] = entry.split(",");
      x = Number(x);
      y = Number(y);
      if (isNaN(x) || isNaN(y)) {
        throw new Error("Invalid node coordinates");
      }
      return { x, y, label };
    });

    edges = edgeInput.split(";").map((pair) => pair.split(",").map(Number));
    
    createSlidersForEdges();
    redrawGraph();
  }
});
