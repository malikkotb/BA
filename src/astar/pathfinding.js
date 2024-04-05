export class PathFinder {
  constructor(context, grid, cellDim) {
    // open set of cells, can be optimized to use a Heap https://stackfull.dev/heaps-in-javascript
    this.openSet = [];
    this.closedSet = [];
    this.grid = grid;
    this.context = context;
    this.edgeIndex = 0;
    this.paths = [];
    this.cellDim = cellDim; // dimensions of a cell in this current config (canvas.height / gridHeight)
  }

  // TODO: will have to loop through all edge-Connections and call this method for each
  // TODO: maybe add a new layer to draw the edge on, to avoid conflictions when rendering multiple edges
  findPath(startCell, targetCell) {
    startCell.state = "START";
    targetCell.state = "END";

    // TODO: need to draw each cell for the startNode, as a node can cover multiple cells
    startCell.draw(this.context, this.cellDim, this.cellDim, startCell.state);
    targetCell.draw(this.context, this.cellDim, this.cellDim, targetCell.state);
    // return;
    // add starting node to Open Set
    this.openSet.push(startCell);

    while (this.openSet.length > 0) {
      let currentCell = this.openSet[0]; // current node with lowest f_cost

      // this is the slowest part of the algorithm -> in each iteration I have to search through the entire openSet to try and find the node with the lowest f_cost

      // loop through all nodes in this.openSet and find node with lowest f_cost
      // start at i = 1, as currentCell = this.openSet[0]
      for (let i = 1; i < this.openSet.length; i++) {
        if (
          this.openSet[i].fCost() < currentCell.fCost() ||
          (this.openSet[i].fCost() === currentCell.fCost() && this.openSet[i].hCost < currentCell.hCost)
        ) {
          // if they have equal fCost, compare hCosts ( and select cell closest to targetNode (lowest hCost))
          currentCell = this.openSet[i];
        }
      }

      // remove currentCell from this.openSet and add it to the this.closedSet
      let indexCurrentCell = this.openSet.indexOf(currentCell);
      if (indexCurrentCell !== -1) {
        this.openSet.splice(indexCurrentCell, 1);
      }

      currentCell.state = "CLOSED";

      this.closedSet.push(currentCell);
      if (currentCell !== startCell && currentCell !== targetCell) {
        currentCell.draw(
          this.context,
          this.cellDim,
          this.cellDim,
          currentCell.state,
          `${currentCell.gCost}, ${currentCell.hCost} = ${currentCell.gCost + currentCell.hCost}`
        );
      }

      if (currentCell === targetCell) {
        // path found
        console.log("path found");
        startCell.state = "START";
        targetCell.state = "END";
        this.retracePath(startCell, targetCell);
        return;
      }

      const neighbours = this.grid.getNeighbors(currentCell);

      // foreach neihgbour of currentCell
      for (let neighbourCell of neighbours) {
        if (neighbourCell.state === "OBSTACLE" || this.closedSet.includes(neighbourCell)) {
          // can't traverse this cell -> skip ahead to next neighbour
          continue;
        }

        // if new path to neighbour is shorter than old path OR if neighbour is not in this.openSet:
        let newMovementCostToNeighbour = currentCell.gCost + this.getDistance(currentCell, neighbourCell);
        if (newMovementCostToNeighbour < neighbourCell.gCost || !this.openSet.includes(neighbourCell)) {
          // set f_cost of neighbour
          neighbourCell.gCost = newMovementCostToNeighbour;
          neighbourCell.hCost = this.getDistance(neighbourCell, targetCell);

          neighbourCell.parent = currentCell; // set parent of neighbourCell to currentCell

          if (neighbourCell.state !== "END") neighbourCell.state = "OPEN";

          // draw label on cell
          neighbourCell.draw(
            this.context,
            this.cellDim, // previously 100
            this.cellDim,
            neighbourCell.state,
            `${neighbourCell.gCost}, ${neighbourCell.hCost} = ${neighbourCell.gCost + neighbourCell.hCost}`
          );

          if (!this.openSet.includes(neighbourCell)) this.openSet.push(neighbourCell);
        } else {
          neighbourCell.draw(
            this.context,
            this.cellDim,
            this.cellDim,
            neighbourCell.state,
            `${neighbourCell.gCost}, ${neighbourCell.hCost} = ${neighbourCell.gCost + neighbourCell.hCost}`
          );
        }
      }
    }
  }

  // TODO: (getImageData )use this function to check if two edges would be rendered on the same side of a Node.
  //     Then if two edges are rendered on the same side of a node. Then I can determine the distance between them
  //     bzw. adjust the docking points on that edge slightly. According to the specification of my aesthetic criteria.

  isCellOccupied(ctx, cellX, cellY, cellWidth, cellHeight) {
    // Calculate the pixel coordinates of the cell
    const pixelX = cellX * cellWidth;
    const pixelY = cellY * cellHeight;

    // Get the pixel data of the cell
    const imageData = ctx.getImageData(pixelX, pixelY, cellWidth, cellHeight);
    const data = imageData.data;

    // Loop through the pixel data and check for non-transparent pixels
    for (let i = 0; i < data.length; i += 4) {
      // Check if the alpha value is greater than 0 (non-transparent)
      if (data[i + 3] > 0) {
        return true; // Cell is occupied
      }
    }

    return false; // Cell is empty
  }

  // retrace steps to get path from startCell to targetCell
  retracePath(startCell, targetCell) {
    // TODO: Requirements:
    // - need to be able to draw a single path on one canvas layer probably, otherwise it is fucked somehow
    // - need to be able to remove the obstacle-cells after every iteration of an edge
    // - draw the nodes first on one layer
    //    then for each iteration: run algorithm once, meaning:
    //    1. run A* with obstacles being other edges and nodes and include weights -> meaning perhaps make cells also obstacles that are close to nodes
    //    2. draw the edge through the smoothest path
    //    3. remove all obstacles and only show the rendered edge
    //    4. add new canvas layer repeat for new edge

    const path = [];
    let currentCell = targetCell;

    while (currentCell !== startCell) {
      if (currentCell !== targetCell) {
        currentCell.state = "FINISHED";
        // console.log(currentCell);
        currentCell.draw(
          this.context,
          this.cellDim,
          this.cellDim,
          currentCell.state,
          `${currentCell.gCost}, ${currentCell.hCost} = ${currentCell.gCost + currentCell.hCost}`
        );
      }
      path.push(currentCell);
      currentCell = currentCell.parent;
    }

    // add startCell to path
    path.push(startCell);

    // path is backwards -> reverse it
    path.reverse();

    this.grid.path = path;

    // remove labels, markings of other cells
    for (let cell of this.openSet) {
      cell.clearCell(this.context, this.cellDim, this.cellDim);
    }

    for (let cell of this.closedSet) {
      if (cell.state !== "START" && cell.state !== "END") {
        // cell.state !== "FINISHED" &&
        cell.clearCell(this.context, this.cellDim, this.cellDim);
      }
    }

    // clear everything in closedSet and openSet for next iteration to work properly
    this.openSet = [];
    this.closedSet = [];

    // draw the edge individually using path
    // this.drawPath(this.context, path, 100, 100);

    // adding the new path to allPaths to render them at the end simulatneously. Another workaround could be adding multiple canvas layers.
    this.paths.push(path);


  }

  // draw edge
  drawPath(ctx, path, cellWidth, cellHeight) {
    if (path.length < 2) return;

    ctx.beginPath();

    const firstCell = path[0];
    const secondCell = path[1];

    let { startX, startY } = this.getStartCoordinates(firstCell, secondCell, this.cellDim, this.cellDim);

    ctx.moveTo(startX, startY);

    // Draw through intermediate points
    for (let i = 1; i < path.length - 1; i++) {
      let x = path[i].x * cellWidth + cellWidth / 2;
      let y = path[i].y * cellHeight + cellHeight / 2;
      ctx.lineTo(x, y);
    }

    const lastCell = path[path.length - 1];
    const secondLastCell = path[path.length - 2];

    // do this for starting point as well. I believe it should be slightly different. Because direction will not be IN going TO the last cell
    // but OUTgoing FROM the start cell

    let { endX, endY } = this.getEndCoordinates(lastCell, secondLastCell, this.cellDim, this.cellDim);

    ctx.lineTo(endX, endY);
   
    ctx.stroke();
  }

  // different apporach, drawing all paths at once
  drawAllPaths(ctx, paths, cellWidth, cellHeight) {
    ctx.beginPath();

    for (const path of paths) {
      if (path.length < 2) continue;

      const firstCell = path[0];
      const secondCell = path[1];

      let { startX, startY } = this.getStartCoordinates(firstCell, secondCell, cellWidth, cellHeight);
      // console.log("startCoordinates: ", startX, startY);
      ctx.moveTo(startX, startY);

      for (let i = 1; i < path.length - 1; i++) {
        let x = path[i].x * cellWidth + cellWidth / 2;
        let y = path[i].y * cellHeight + cellHeight / 2;
        ctx.lineTo(x, y);
      }

      const lastCell = path[path.length - 1];
      const secondLastCell = path[path.length - 2];

      let { endX, endY } = this.getEndCoordinates(lastCell, secondLastCell, cellWidth, cellHeight);
      ctx.lineTo(endX, endY);
    }
    ctx.stroke();
  }

  getStartCoordinates(firstCell, secondCell, cellWidth, cellHeight) {
    // direction for first to second cell
    let directionX = secondCell.x - firstCell.x;
    let directionY = secondCell.y - firstCell.y;

    const direction = this.getDirection(directionX, directionY);

    const leftObstacle = this.grid.getCell(firstCell.x - 1, firstCell.y).state === "OBSTACLE";
    const rightObstacle = this.grid.getCell(firstCell.x + 1, firstCell.y).state === "OBSTACLE";
    const topObstacle = this.grid.getCell(firstCell.x, firstCell.y - 1).state === "OBSTACLE";
    const bottomObstacle = this.grid.getCell(firstCell.x, firstCell.y + 1).state === "OBSTACLE";

    let adjustment = "";
    switch (direction) {
      case "up":
        adjustment = "middleTop";
        break;
      case "down":
        adjustment = "middleBottom";
        break;
      case "right":
        adjustment = "middleLeft";
        break;
      case "left":
        adjustment = "middleRight";
        break;
      case "up-right":
        if (rightObstacle && !topObstacle) adjustment = "middleTop";
        if (topObstacle && !rightObstacle) adjustment = "middleRight";
        if ((topObstacle && rightObstacle) || (!topObstacle && !rightObstacle)) adjustment = "topRightCorner";
        break;
      case "up-left":
        if (leftObstacle && !topObstacle) adjustment = "middleTop";
        if (topObstacle && !leftObstacle) adjustment = "middleLeft";
        if ((topObstacle && leftObstacle) || (!topObstacle && !leftObstacle)) adjustment = "topLeftCorner";
        break;
      case "down-right":
        if (rightObstacle && !bottomObstacle) adjustment = "middleBottom";
        if (bottomObstacle && !rightObstacle) adjustment = "middleRight";
        if ((bottomObstacle && rightObstacle) || (!bottomObstacle && !rightObstacle)) adjustment = "bottomRightCorner";
        break;
      case "down-left":
        if (leftObstacle && !bottomObstacle) adjustment = "middleBottom";
        if (bottomObstacle && !leftObstacle) adjustment = "middleLeft";
        if ((leftObstacle && bottomObstacle) || (!leftObstacle && !bottomObstacle)) adjustment = "bottomLeftCorner";
        break;
      default:
        break;
    }
    return this.getAdjustedStartCoordinates(firstCell, cellWidth, cellHeight, adjustment);
  }

  getAdjustedStartCoordinates(firstCell, cellWidth, cellHeight, adjustment) {
    let startX, startY;

    // TODO: these need to be adjusted for multiple edges going in on a single node, maybe need to be pivoted to the side a little, and maybe add a variable to each node
    // which tracks how many ingoing edges it has to adjust accordingly
    // Parallel edges need to be possible (perhaps by rendering one canvas above the next and adjusting the endcoordinates a little to make it look like they are parallel)

    switch (adjustment) {
      case "middleTop":
        // start adjustment to touch the middle of the top edge of the last cell
        startX = firstCell.x * cellWidth + cellWidth / 2;
        startY = firstCell.y * cellHeight;
        break;
      case "middleRight":
        // start adjustment to touch middle of the right edge of the last cell
        startX = firstCell.x * cellWidth + cellWidth;
        startY = firstCell.y * cellHeight + cellHeight / 2;
        break;
      case "middleLeft":
        // start adjustment to touch middle of the left edge of the last cell
        startX = firstCell.x * cellWidth;
        startY = firstCell.y * cellHeight + cellHeight / 2;
        break;
      case "middleBottom":
        // start adjustment to touch middle of the bottom edge of the last cell
        startX = firstCell.x * cellWidth + cellWidth / 2;
        startY = firstCell.y * cellHeight + cellHeight;
        break;
      case "topRightCorner":
        // start adjustment to touch top right corner of the last cell
        startX = firstCell.x * cellWidth + cellWidth;
        startY = firstCell.y * cellHeight;
        break;
      case "topLeftCorner":
        // start adjustment to touch top left corner of the last cell
        startX = firstCell.x * cellWidth;
        startY = firstCell.y * cellHeight;
        break;
      case "bottomLeftCorner":
        // start adjustment to touch bottom left corner of the last cell
        startX = firstCell.x * cellWidth;
        startY = firstCell.y * cellHeight + cellHeight;
        break;
      case "bottomRightCorner":
        // start adjustment to touch bottom right corner of the last cell
        startX = firstCell.x * cellWidth + cellWidth;
        startY = firstCell.y * cellHeight + cellHeight;
        break;
      default:
        console.error("Invalid adjustment type");
    }

    return { startX, startY };
  }

  getEndCoordinates(lastCell, secondLastCell, cellWidth, cellHeight) {
    // idea
    // Example: if direction is "down-left" -> that means the second-to-last-cell is the top-right neighbour of the last cell
    // In this case we need to check if there is an obstacle on top of the last cell, or on the right of the last cell
    // those are the 2 options (2 sides of the last-cell) where the edge can end at

    // now if there is an obstacle on the right of the last-cell then the edge needs to finish on the top side of the last-cell

    // if there is an obstacle on top of the last-cell, then the edge has to finish on the right side of the last-cell

    // if there is an obstacle both on top and on the left of the last cell, the edge has to finish in the top right corner of the last-cell

    // Determine the direction from the second to the last cell
    let directionX = lastCell.x - secondLastCell.x;
    let directionY = lastCell.y - secondLastCell.y;

    const direction = this.getDirection(directionX, directionY);

    // Check for obstacles in all adjacent cells to the last cell
    const leftObstacle = this.grid.getCell(lastCell.x - 1, lastCell.y).state === "OBSTACLE";
    const rightObstacle = this.grid.getCell(lastCell.x + 1, lastCell.y).state === "OBSTACLE";
    const topObstacle = this.grid.getCell(lastCell.x, lastCell.y - 1).state === "OBSTACLE";
    const bottomObstacle = this.grid.getCell(lastCell.x, lastCell.y + 1).state === "OBSTACLE";
    // const topLeftObstacle = this.grid.getCell(lastCell.x - 1, lastCell.y - 1).state === "OBSTACLE";
    // const topRightObstacle = this.grid.getCell(lastCell.x + 1, lastCell.y - 1).state === "OBSTACLE";
    // const bottomLeftObstacle = this.grid.getCell(lastCell.x - 1, lastCell.y + 1).state === "OBSTACLE";
    // const bottomRightObstacle = this.grid.getCell(lastCell.x + 1, lastCell.y + 1).state === "OBSTACLE";

    let adjustment = "";
    switch (direction) {
      case "up":
        adjustment = "middleBottom";
        break;
      case "down":
        adjustment = "middleTop";
        break;
      case "right":
        adjustment = "middleLeft";
        break;
      case "left":
        adjustment = "middleRight";
        break;
      case "up-right":
        if (leftObstacle && !bottomObstacle) {
          adjustment = "middleBottom";
        }
        if (bottomObstacle && !leftObstacle) {
          adjustment = "middleLeft";
        }
        if ((leftObstacle && bottomObstacle) || (!leftObstacle && !bottomObstacle)) {
          adjustment = "bottomLeftCorner";
        }
        break;
      case "up-left":
        if (rightObstacle && !bottomObstacle) {
          adjustment = "middleBottom";
        }
        if (bottomObstacle && !leftObstacle) {
          adjustment = "middleRight";
        }
        if ((rightObstacle && bottomObstacle) || (!rightObstacle && !bottomObstacle)) {
          adjustment = "bottomRightCorner";
        }
        break;
      case "down-right":
        if (leftObstacle && !topObstacle) {
          adjustment = "middleTop";
        }
        if (topObstacle && !leftObstacle) {
          adjustment = "middleLeft";
        }
        if ((leftObstacle && topObstacle) || (!leftObstacle && !topObstacle)) {
          adjustment = "topLeftCorner";
        }
        break;
      case "down-left":
        if (rightObstacle && !topObstacle) {
          adjustment = "middleTop";
        }
        if (topObstacle && !rightObstacle) {
          adjustment = "middleRight";
        }
        if (rightObstacle && topObstacle) {
          adjustment = "topRightCorner";
        }
        if (!rightObstacle && !topObstacle) {
          // no obstacle top or right
          // TODO: maybe adjust this but only maybe
          adjustment = "topRightCorner";
        }
        break;
      case "stationary":
        break;
      default:
        break;
    }

    // function should return x, y coordinates of docking point of edge
    return this.getAdjustedEndCoordinates(lastCell, cellWidth, cellHeight, adjustment);
  }

  getAdjustedEndCoordinates(lastCell, cellWidth, cellHeight, adjustment) {
    let endX, endY;

    // TODO: these need to be adjusted for multiple edges going in on a single node, maybe need to be pivoted to the side a little, and maybe add a variable to each node
    // which tracks how many ingoing edges it has to adjust accordingly
    // Parallel edges need to be possible (perhaps by rendering one canvas above the next and adjusting the endcoordinates a little to make it look like they are parallel)

    switch (adjustment) {
      case "middleTop":
        // End adjustment to touch the middle of the top edge of the last cell
        endX = lastCell.x * cellWidth + cellWidth / 2;
        endY = lastCell.y * cellHeight;
        break;
      case "middleRight":
        // End adjustment to touch middle of the right edge of the last cell
        endX = lastCell.x * cellWidth + cellWidth;
        endY = lastCell.y * cellHeight + cellHeight / 2;
        break;
      case "middleLeft":
        // End adjustment to touch middle of the left edge of the last cell
        endX = lastCell.x * cellWidth;
        endY = lastCell.y * cellHeight + cellHeight / 2;
        break;
      case "middleBottom":
        // End adjustment to touch middle of the bottom edge of the last cell
        endX = lastCell.x * cellWidth + cellWidth / 2;
        endY = lastCell.y * cellHeight + cellHeight;
        break;
      case "topRightCorner":
        // End adjustment to touch top right corner of the last cell
        endX = lastCell.x * cellWidth + cellWidth;
        endY = lastCell.y * cellHeight;
        break;
      case "topLeftCorner":
        // End adjustment to touch top left corner of the last cell
        endX = lastCell.x * cellWidth;
        endY = lastCell.y * cellHeight;
        break;
      case "bottomLeftCorner":
        // End adjustment to touch bottom left corner of the last cell
        endX = lastCell.x * cellWidth;
        endY = lastCell.y * cellHeight + cellHeight;
        break;
      case "bottomRightCorner":
        // End adjustment to touch bottom right corner of the last cell
        endX = lastCell.x * cellWidth + cellWidth;
        endY = lastCell.y * cellHeight + cellHeight;
        break;
      default:
        console.error("Invalid adjustment type");
    }

    return { endX, endY };
  }

  getDirection(directionX, directionY) {
    // INgoing direction to last cell
    if (directionX === 0 && directionY < 0) {
      return "up";
    } else if (directionX === 0 && directionY > 0) {
      return "down";
    } else if (directionX > 0 && directionY === 0) {
      return "right";
    } else if (directionX < 0 && directionY === 0) {
      return "left";
    } else if (directionX > 0 && directionY < 0) {
      return "up-right";
    } else if (directionX < 0 && directionY < 0) {
      return "up-left";
    } else if (directionX > 0 && directionY > 0) {
      return "down-right";
    } else if (directionX < 0 && directionY > 0) {
      return "down-left";
    } else {
      return "stationary"; // This case implies no movement
    }
  }

  getDistance(cellA, cellB) {
    // first count on X-axis, how many cells cellA is away from cellB
    // then count on Y-axis, ""
    // then take lowest number (either x or y axis count)
    // => will determine how many diagonal moves it will take,
    // to be either horizontally or vertically inline with the targetCell
    // ...then subtract the higher count (either x or y) from the lower count (= how many steps to get to the node, going either straight up or across)
    // ...if distance vertically and horizontally = 10 (as a cell right now is 10x10 units), and distance diagonally is ≈ 14 (pyhagoras theorem)
    // => equation:
    // if x > y
    // 14y + 10(x-y)
    // ...else if y > x 
    // 14x + 10(y-x)

    let distanceX = Math.abs(cellA.x - cellB.x);
    let distanceY = Math.abs(cellA.y - cellB.y);

    if (distanceX > distanceY) return 14 * distanceY + 10 * (distanceX - distanceY);
    return 14 * distanceX + 10 * (distanceY - distanceX);
  }
}
