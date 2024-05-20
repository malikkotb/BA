function findPath(start, target) {
  const openSet = new PriorityQueue();

  // priority is the fCost
  openSet.enqueue(start, 0);

  const cameFrom = {};
  const gScore = {};
  const fScore = {};

  gScore[start] = 0;
  fScore[start] = this.calculateDistance(start, target);

  while (!openSet.isEmpty()) {
    let current = openSet.dequeue(); // get current node in openSet wit lowest f_cost
    if (current.x === target.x && current.y === target.y) {
      return this.reconstructPath(cameFrom, target);
    }

    for (let neighbour of this.adjacencyList.get(current)) {
      // this.calculateDistance(neighbour, current) represents the edge weight from neighbour to currnet
      let temporaryGScore = gScore[current] + this.calculateDistance(neighbour, current);

      if (temporaryGScore < gScore[neighbour]) {
        cameFrom[neighbour] = current;
        gScore[neighbour] = temporaryGScore;
        fScore[neighbour] =
          gScore[neighbour] + this.calculateDistance(neighbour, target);
        if (!openSet.items.some((item) => item.item.x === neighbour.x && item.item.y === neighbour.y)) {
          openSet.enqueue(neighbour, fScore[neighbour]);
        }
      }
    }
  }
  return null;
}
