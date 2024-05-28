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
