// calculate intersection point of bezier curve and node
export function intersectionCurveAndNode(path) {
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

//   export function

export function getNode(point) {
    if (!point) return null;
    let midPoint = null;
    nodeCoordinates.some((node) => {
      if (node.midpoint.x === point.x && node.midpoint.y === point.y) {
        midPoint = node;
      }
    });
    return midPoint;
  }