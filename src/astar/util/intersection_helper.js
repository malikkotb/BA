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