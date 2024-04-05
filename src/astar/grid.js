import { Cell } from "./Cell.js";
// we need a 2d array of Cells (representing our grid)

export class Grid {
  constructor(context, width, height, nodeCoordinates, canvasHeight) {
    this.context = context;
    // dimensions of grid-size
    this.width = width;
    this.height = height;
    this.grid = [];
    this.path = [];
    this.nodeCoordinates = nodeCoordinates; // list of coordinates of nodes

    this.canvasHeight = canvasHeight; // use to calculate dimensions (width and height of cells)

    // Steps before running A*
    // 1. Create the grid (not marked yet; just the grid)
    // 2. check the configuration of states (they are given in coordinates)
    //    -> if coordinates of a state is inside a specific cell then mark that cell as obstacle

    // Top-Left Corner (Given): (nodeX, nodeY)
    // Top-Right Corner: (nodeX + nodeWidth, nodeY)
    // Bottom-Left Corner: (nodeX, nodeY + nodeHeight)
    // Bottom-Right Corner: (nodeX + nodeWidth, nodeY + nodeHeight)

    const cellDim = canvasHeight / this.width; // cell Dimensions
    const cellAdjustment = cellDim / 10;

    // create the grid
    for (let x = 0; x < width; x++) {
      this.grid[x] = [];
      for (let y = 0; y < height; y++) {
        const cellX = x * cellAdjustment; 
        const cellY = y * cellAdjustment;

        let state = "";

        //TODO: optimize this loop, as its now getting called 10000 times for each node
        nodeCoordinates.forEach((node) => {
          const { x: nodeX, y: nodeY, width: nodeWidth, height: nodeHeight } = node;

          // get area of entire cell
          const cellRight = cellX + cellAdjustment;
          const cellBottom = cellY + cellAdjustment;

          // Check if any part of the node intersects with the cell's area
          if (
            nodeX / 10 < cellRight &&
            (nodeX + nodeWidth) / 10 > cellX &&
            nodeY / 10 < cellBottom &&
            (nodeY + nodeHeight) / 10 > cellY
          ) {
            state = "OBSTACLE";
          }
        });

        if (this.grid[x][y]) {
          console.log("already an objete here oui");
        }
        this.grid[x][y] = new Cell(context, x, y, cellDim, cellDim, state); // cellWidth and height are 100 (bc. grid right now is 1000x1000 -> 10 cells)
      }
    }
  }

  // Method to get a cell at a specific coordinate
  getCell(x, y) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return this.grid[x][y];
    }
    // return null; // Return null if the coordinates are out of bounds
  }

  getNeighbors(cell) {
    // params: coordinates of cell I want to find neighbours of
    let neighbours = [];

    // loop that searches in 3x3 block around the current cell
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        if (x === 0 && y === 0) continue; // -> center of 3x3 block -> cell currently inspected

        const checkX = cell.x + x;
        const checkY = cell.y + y;

        const neighbour = this.getCell(checkX, checkY);

        // if neighbor-Cell is in bounds of grid -> add it to list of neighbours
        if (neighbour) neighbours.push(neighbour);
      }
    }

    return neighbours;
  }
}
