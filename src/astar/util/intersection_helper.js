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