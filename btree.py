class BNode:
    """A node in the B-Tree"""
    def __init__(self, leaf=True):
        self.keys = []
        self.children = []
        self.leaf = leaf
    
    def to_dict(self):
        """Convert node to dictionary for JSON serialization"""
        return {
            'keys': self.keys,
            'leaf': self.leaf,
            'children': [child.to_dict() for child in self.children]
        }


class BTree:
    """B-Tree data structure implementation"""
    
    def __init__(self, t=3):
        """
        Initialize B-Tree
        Args:
            t: Minimum degree (minimum number of keys is t-1)
        """
        self.root = BNode()
        self.t = t  # Minimum degree
    
    def search(self, key, node=None):
        """
        Search for a key in the tree
        Args:
            key: The key to search for
            node: Starting node (defaults to root)
        Returns:
            True if key exists, False otherwise
        """
        if node is None:
            node = self.root
        
        i = 0
        while i < len(node.keys) and key > node.keys[i]:
            i += 1
        
        if i < len(node.keys) and key == node.keys[i]:
            return True
        
        if node.leaf:
            return False
        
        return self.search(key, node.children[i])
    
    def insert(self, key):
        """
        Insert a key into the tree
        Args:
            key: The key to insert
        """
        root = self.root
        
        if len(root.keys) == (2 * self.t) - 1:
            # Root is full, split it
            new_root = BNode(leaf=False)
            new_root.children.append(self.root)
            self._split_child(new_root, 0)
            self.root = new_root
        
        self._insert_non_full(self.root, key)
    
    def _insert_non_full(self, node, key):
        """
        Insert key into a node that is not full
        Args:
            node: The node to insert into
            key: The key to insert
        """
        i = len(node.keys) - 1
        
        if node.leaf:
            # Insert key in sorted order
            node.keys.append(key)
            node.keys.sort()
        else:
            # Find child to insert into
            while i >= 0 and key < node.keys[i]:
                i -= 1
            i += 1
            
            # Split child if full
            if len(node.children[i].keys) == (2 * self.t) - 1:
                self._split_child(node, i)
                if key > node.keys[i]:
                    i += 1
            
            self._insert_non_full(node.children[i], key)
    
    def _split_child(self, parent, index):
        """
        Split a full child node
        Args:
            parent: Parent node
            index: Index of child to split
        """
        t = self.t
        full_child = parent.children[index]
        new_child = BNode(leaf=full_child.leaf)
        
        # Split point (middle index)
        mid = t - 1
        
        # Move the middle key up to parent
        parent.keys.insert(index, full_child.keys[mid])
        
        # Split keys: left child keeps [0:mid], right child gets [mid+1:]
        new_child.keys = full_child.keys[mid + 1:]
        full_child.keys = full_child.keys[:mid]
        
        # Split children if not leaf
        if not full_child.leaf:
            new_child.children = full_child.children[mid + 1:]
            full_child.children = full_child.children[:mid + 1]
        
        # Insert new child into parent
        parent.children.insert(index + 1, new_child)
    
    def delete(self, key):
        """
        Delete a key from the tree
        Args:
            key: The key to delete
        """
        self._delete_from_node(self.root, key)
        
        # If root is empty after deletion, make its only child the new root
        if len(self.root.keys) == 0:
            if not self.root.leaf and len(self.root.children) > 0:
                self.root = self.root.children[0]
    
    def _delete_from_node(self, node, key):
        """
        Delete key from a specific node
        Args:
            node: The node to delete from
            key: The key to delete
        """
        i = 0
        while i < len(node.keys) and key > node.keys[i]:
            i += 1
        
        if i < len(node.keys) and key == node.keys[i]:
            # Key found in this node
            if node.leaf:
                self._remove_from_leaf(node, i)
            else:
                self._remove_from_non_leaf(node, i)
        elif not node.leaf:
            # Key might be in subtree
            is_in_last_child = (i == len(node.keys))
            
            if i < len(node.children) and len(node.children[i].keys) < self.t:
                self._fill(node, i)
            
            if is_in_last_child and i > len(node.keys):
                self._delete_from_node(node.children[i - 1], key)
            else:
                if i < len(node.children):
                    self._delete_from_node(node.children[i], key)
    
    def _remove_from_leaf(self, node, index):
        """Remove key at index from leaf node"""
        node.keys.pop(index)
    
    def _remove_from_non_leaf(self, node, index):
        """Remove key at index from non-leaf node"""
        key = node.keys[index]
        
        if len(node.children[index].keys) >= self.t:
            # Get predecessor from left child
            predecessor = self._get_predecessor(node.children[index])
            node.keys[index] = predecessor
            self._delete_from_node(node.children[index], predecessor)
        elif len(node.children[index + 1].keys) >= self.t:
            # Get successor from right child
            successor = self._get_successor(node.children[index + 1])
            node.keys[index] = successor
            self._delete_from_node(node.children[index + 1], successor)
        else:
            # Merge with sibling
            self._merge(node, index)
            self._delete_from_node(node.children[index], key)
    
    def _get_predecessor(self, node):
        """Get the maximum key in the subtree"""
        while not node.leaf:
            node = node.children[-1]
        return node.keys[-1]
    
    def _get_successor(self, node):
        """Get the minimum key in the subtree"""
        while not node.leaf:
            node = node.children[0]
        return node.keys[0]
    
    def _fill(self, parent, index):
        """Fill child node at index if it has fewer than t keys"""
        # Borrow from left sibling
        if index != 0 and len(parent.children[index - 1].keys) >= self.t:
            self._borrow_from_prev(parent, index)
        # Borrow from right sibling
        elif index != len(parent.children) - 1 and len(parent.children[index + 1].keys) >= self.t:
            self._borrow_from_next(parent, index)
        # Merge with sibling
        else:
            if index != len(parent.children) - 1:
                self._merge(parent, index)
            else:
                self._merge(parent, index - 1)
    
    def _borrow_from_prev(self, parent, child_index):
        """Borrow a key from previous sibling"""
        child = parent.children[child_index]
        sibling = parent.children[child_index - 1]
        
        # Move key from parent to child
        child.keys.insert(0, parent.keys[child_index - 1])
        
        # Move key from sibling to parent
        parent.keys[child_index - 1] = sibling.keys.pop()
        
        # Move child pointer if not leaf
        if not child.leaf:
            child.children.insert(0, sibling.children.pop())
    
    def _borrow_from_next(self, parent, child_index):
        """Borrow a key from next sibling"""
        child = parent.children[child_index]
        sibling = parent.children[child_index + 1]
        
        # Move key from parent to child
        child.keys.append(parent.keys[child_index])
        
        # Move key from sibling to parent
        parent.keys[child_index] = sibling.keys.pop(0)
        
        # Move child pointer if not leaf
        if not child.leaf:
            child.children.append(sibling.children.pop(0))
    
    def _merge(self, parent, index):
        """Merge child with its sibling"""
        child = parent.children[index]
        sibling = parent.children[index + 1]
        
        # Pull key from parent and merge with right sibling
        child.keys.append(parent.keys[index])
        child.keys.extend(sibling.keys)
        
        # Copy child pointers
        if not child.leaf:
            child.children.extend(sibling.children)
        
        # Remove key from parent
        parent.keys.pop(index)
        parent.children.pop(index + 1)
    
    def get_tree_structure(self):
        """
        Get the tree structure as a dictionary
        Returns:
            Dictionary representation of the tree
        """
        return self.root.to_dict()
    
    def traverse(self, node=None):
        """
        Traverse the tree in-order
        Returns:
            List of keys in sorted order
        """
        if node is None:
            node = self.root
        
        result = []
        i = 0
        
        for i in range(len(node.keys)):
            if not node.leaf and i < len(node.children):
                result.extend(self.traverse(node.children[i]))
            result.append(node.keys[i])
        
        if not node.leaf and len(node.children) > i + 1:
            result.extend(self.traverse(node.children[i + 1]))
        
        return result