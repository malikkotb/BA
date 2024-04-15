import { PriorityQueue } from "./pq.js";
export class aStar {
  // Edge Weights: Represent the Euclidean distance between connected nodes.
  // g-Cost: Cumulative distance traveled from the start node along the explored path.
  // h-Cost: Estimated distance from the current node to the goal node, based on Euclidean distance.
  // f-Cost: Total estimated cost of reaching the goal node via the current node, sum of g-cost and h-cost.

  findPaths(adjacencyList, start, target) {
    // TODO: change openSet from arrray to priority queue with min-heap implemenation
    const openSet = new PriorityQueue();

    // priority is the fCost
    openSet.enqueue(start, 0);

    const cameFrom = {};
    const gScore = {};
    const fScore = {};

    adjacencyList.forEach((neighbours, node) => {
      gScore[JSON.stringify(node)] = Infinity;
      fScore[JSON.stringify(node)] = Infinity;
    });

    gScore[JSON.stringify(start)] = 0;
    fScore[JSON.stringify(start)] = this.calculateDistance(start, target);

    console.log("");

    while (!openSet.isEmpty()) {
      let current = openSet.dequeue(); // get current node in openSet wit lowest f_cost

      // get neighbours/(connected nodes) of a node: adjacencyList.get(current);
      if (current.x === target.x && current.y === target.y) {
        console.log("path found");
        return this.reconstructPath(cameFrom, target);
        // return this.retracePath(start, target);
      }

      for (let neighbour of adjacencyList.get(current)) {
        console.log("neighbour: ", neighbour);
        // this.calculateDistance(neighbour, current) represents the edge weight from neighbour to currnet
        const tentativeGScore = gScore[JSON.stringify(current)] + this.calculateDistance(neighbour, current);
        // console.log("gScore[JSON.stringify(current)]", gScore[JSON.stringify(current)]);
        // console.log("fScore[JSON.stringify(current)]", fScore[JSON.stringify(current)]);
        // console.log("hCost", this.calculateDistance(neighbour, current));
        console.log("tentativeGscore", tentativeGScore);
        console.log("");
        if (tentativeGScore < gScore[JSON.stringify(neighbour)]) {
          cameFrom[JSON.stringify(neighbour)] = current;
          gScore[JSON.stringify(neighbour)] = tentativeGScore;
          fScore[JSON.stringify(neighbour)] =
            gScore[JSON.stringify(neighbour)] + this.calculateDistance(neighbour, target);
          if (!openSet.items.some((item) => item.item.x === neighbour.x && item.item.y === neighbour.y)) {
            openSet.enqueue(neighbour, fScore[JSON.stringify(neighbour)]);
          }
        }
      }
    }
    console.log("No path found");
    return null;
  }

  test() {
    // Test Case 1: Enqueue items with different priorities
    const pq1 = new PriorityQueue();
    pq1.enqueue("Task A", 3); // Priority 3
    pq1.enqueue("Task B", 1); // Priority 1
    pq1.enqueue("Task C", 2); // Priority 2
    console.log("Expected output: Task B:", pq1.dequeue()); // Expected Output: Task B
    console.log("Expected output: Task C:", pq1.dequeue()); // Expected Output: Task C
    console.log("Expected output: Task A:", pq1.dequeue()); // Expected Output: Task A

    // Test Case 2: Enqueue items with the same priority
    const pq2 = new PriorityQueue();
    pq2.enqueue("Task 1", 2);
    pq2.enqueue("Task 2", 2);
    pq2.enqueue("Task 3", 2);
    console.log("Expected output: Task 1:", pq2.dequeue()); // Expected Output: Task 1
    console.log("Expected output: Task 2:", pq2.dequeue()); // Expected Output: Task 2
    console.log("Expected output: Task 3:", pq2.dequeue()); // Expected Output: Task 3 (order can vary due to insertion order)

    // Test Case 4: Check if the queue is empty
    const pq4 = new PriorityQueue();
    pq4.enqueue("Task A", 1);
    pq4.dequeue();
    const isEmpty = pq4.isEmpty();
    console.log("Expected output: true:", isEmpty); // Expected Output: true

    // Test Case 5: Enqueue and dequeue mixed operations
    const pq5 = new PriorityQueue();
    pq5.enqueue("Task A", 3);
    pq5.enqueue("Task B", 1);
    pq5.enqueue("Task C", 2);
    pq5.dequeue(); // Removes Task B
    pq5.enqueue("Task D", 5);
    pq5.enqueue("Task E", 4);
    pq5.dequeue(); // Removes Task C
    console.log("Expected output: Task A:", pq5.dequeue()); // Expected Output: Task A
    console.log("Expected output: Task E:", pq5.dequeue()); // Expected Output: Task E
    console.log("Expected output: Task D:", pq5.dequeue()); // Expected Output: Task D
  }

  reconstructPath(cameFrom, current) {
    const totalPath = [current];
    while (cameFrom[JSON.stringify(current)]) {
      current = cameFrom[JSON.stringify(current)];
      totalPath.unshift(current);
    }
    console.log(totalPath);
    return totalPath;
  }

  retracePath() {}

  // Function to calculate Euclidean distance between two nodes
  // use as heuristic
  calculateDistance(node1, node2) {
    const dx = node2.x - node1.x;
    const dy = node2.y - node1.y;
    return Math.floor(Math.sqrt(dx * dx + dy * dy));
  }
}
