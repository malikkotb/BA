// Class for a Cell/Node/Tile

// A cell can have two states: walkable or not-walkable (so an obstacle)

export class Cell {
  constructor(context, x, y, width, height, state) {
    // position of cell in the grid
    this.x = x; // X coordinate
    this.y = y; // Y coordinate
    this.state = state; // status of cell
    this.parent = null; // Parent cell in the path
    this.gCost = 0; // Cost from the start node
    this.hCost = 0; // Heuristic cost to the end node
    this.width = width;
    this.height = height;
    this.draw(context, width, height, state);
  }

  fCost() {
    // Total cost
    return this.gCost + this.hCost;
  }

  draw(ctx, cellWidth, cellHeight, state, label = "") {
   
    // TODO: issue of 1 node covering only 1 cell, can also lie here
    let xPosition = this.x * cellWidth;
    let yPosition = this.y * cellHeight;

    // fill the cell
    let color = "white";
    switch (state) {
      case "START":
        color = "orange";
        break;
      case "END":
        color = "lightblue";
        break;
      case "OPEN":
        color = "green";
        break;
      case "CLOSED":
        color = "pink";
        break;
      case "OBSTACLE":
        color = "gray";
        break;
      case "FINISHED":
        color = "lightblue";
        break;
      default:
        break;
    }
    ctx.fillStyle = color;
    ctx.fillRect(xPosition, yPosition, cellWidth, cellHeight);

    // border
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.strokeRect(xPosition, yPosition, cellWidth, cellHeight);

    // render label
    // if (state === "OPEN" || state === "CLOSED" || state === "FINISHED" || state === "END") {
    //   ctx.fillStyle = "black";
    //   ctx.font = "16px Arial"; // adjust font size and style as needed
    //   ctx.textAlign = "center";
    //   ctx.textBaseline = "middle";
    //   ctx.fillText(label, xPosition + cellWidth / 2, yPosition + cellHeight / 2);
    // }
  }

  clearCell(ctx, cellWidth, cellHeight) {
    let xPosition = this.x * cellWidth;
    let yPosition = this.y * cellHeight;
  
    ctx.clearRect(xPosition, yPosition, cellWidth, cellHeight);

    // Keep border
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.strokeRect(xPosition, yPosition, cellWidth, cellHeight);
  }
  

}
