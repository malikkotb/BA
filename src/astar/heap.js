class HeapItem {
  constructor(value) {
    this.value = value;
    this.heapIndex = 0; // Initialized heap index
  }

  compareTo(otherItem) {
    // this.value being the f_cost
    // if this.value has higher priority than otherItem then it returns 1, if it has the same priority -> returns 0, if its got lower priority it returns -1

    if (this.value < otherItem.value) {
      return -1; // This instance is less than otherItem
    } else if (this.value > otherItem.value) {
      return 1; // This instance is greater than otherItem
    } else {
      return 0; // This instance is equal to otherItem
    }
  }

  equals(other) {
    // Check if 'other' is an instance of HeapItem and has the same value
    return other instanceof HeapItem && this.value === other.value && this.heapIndex === other.heapIndex;
  }
}

export class Heap {
  // max. size of the heap is, since an array is difficult to resize
  // in case of our use case (poath finding) -> size-of-grid-X * size-of-grid-Y to get the max. amount of nodes that could be in the heap at any given time

  // we actually don't need to know maxHeapSize, as javascript arrays are dynamic
  constructor(context) {
    this.items = [];
    this.currentItemCount = 0;
  }

  // Method to add an item to the heap
  addItem(item) {
    // I want each item to keep track of its own index in the heap and two items need to be comparable -> to say which item has the higher priority and
    // sort it in the heap
    this.items.push(item);
    item.heapIndex = this.currentItemCount;
    this.sortUp(item);
    this.currentItemCount++; // increment currentItemCount
  }

  updateItem(item) {
    // in case I want to change the priority of an item
    // i.e. in Pathfinding, where I might find a cell in the openSet which I want to update with a lower f_cost bc. I've found a new path to it
    // -> need to be able to update its position in the heap
    
    // if the priority has been increased -> call sortUp()
    sortUp(item);
    // in pathfinding you'll only ever increase the priority and not decrease it -> no need to call sortDown()

  }

  count() {
    return this.currentItemCount;
  }

  removeFirstItem() {
    let firstItem = this.items[0];
    this.currentItemCount--;

    // now I need to take the item at the end of the heap and put it into the first place
    this.items[0] = this.items[this.currentItemCount];
    this.items[0].heapIndex = 0;
    this.sortDown(this.items[0]);
    return firstItem;
  }

  contains(item) {
    // method to check if heap contains specific item
    return items[item.heapIndex].equals(item);
  }

  sortDown(item) {
    while (true) {
      let leftChildIndex = item.heapIndex * 2 + 1;
      let rightChildIndex = item.heapIndex * 2 + 2;
      let swapIndex = 0;

      // check if item has at least one child (the child on the left)
      if (leftChildIndex < this.currentItemCount) {
        swapIndex = leftChildIndex;

        // then check if item also has right child
        if (rightChildIndex < this.currentItemCount) {
          // then need to check which of the 2 children has got a higher priority and set the swapIndex to that child
          if (this.items[leftChildIndex].compareTo(this.items[rightChildIndex]) < 0) {
            // if leftChildIndex has a lower priority than rightChildIndex
            swapIndex = rightChildIndex;
            // now swapIndex is equal to the child with the highest priority
          }
        }

        // check if parent has lower priority than its highest priority child in which case -> swap them
        if (item.compareTo(items[swapIndex]) < 0) {
          this.swapItems(item, items[swapIndex]);
        } else {
          // if parent has higher priority than both of its children, then its in its correct position
          return;
        }
      } else {
        // parent doesnt have any children, then its in its correct position
        return;
      }
    }
  }

  // method to maintain heap property after adding an item
  sortUp(heapItem) {
    let parentIndex = Math.floor((heapItem.heapIndex - 1) / 2);

    while (true) {
      let parentItem = this.items[parentIndex];
      if (heapItem.compareTo(parentItem) > 0) {
        // if heapItem has higher priority than parentItem (which in this case means it has a lower f_cost) -> then swap these items
        this.swapItems(heapItem, parentItem);
      } else {
        break; // as soon as the item is no longer of a higher priority than its parentItem -> break out of loop
      }
      parentIndex = Math.floor((heapItem.heapIndex - 1) / 2);
    }
  }

  // Method to swap items in the heap
  swapItems(item1, item2) {
    const index1 = item1.heapIndex;
    const index2 = item2.heapIndex;
    this.items[index1] = item2;
    this.items[index2] = item1;
    item1.heapIndex = index2;
    item2.heapIndex = index1;
  }
}

// // Example usage
// const heap = new Heap();
// heap.addItem(new HeapItem(5));
// heap.addItem(new HeapItem(3));
// heap.addItem(new HeapItem(8));
// heap.addItem(new HeapItem(1));

// console.log(heap.items.map(item => item.value)); // Output: [1, 3, 8, 5] (heapified array)
