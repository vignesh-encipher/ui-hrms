import { OrgTreeNode } from '@/services/organizationService';

// Flatten tree into single list for easy searching/lookups
export const flattenTree = (nodes: OrgTreeNode[]): OrgTreeNode[] => {
  const result: OrgTreeNode[] = [];
  const traverse = (list: OrgTreeNode[]) => {
    for (const item of list) {
      result.push(item);
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    }
  };
  traverse(nodes);
  return result;
};

// Check if moving targetId under newParentId creates a circular dependency
export const isCircularDependency = (targetId: string, newParentId: string | undefined, allNodes: OrgTreeNode[]): boolean => {
  if (!newParentId) return false;
  if (targetId === newParentId) return true;

  const nodeMap = new Map<string, OrgTreeNode>();
  flattenTree(allNodes).forEach((n) => nodeMap.set(n.employeeId, n));

  let currentId: string | undefined = newParentId;
  while (currentId) {
    if (currentId === targetId) {
      return true; // Circular!
    }
    const parent = nodeMap.get(currentId);
    currentId = parent?.managerId;
  }
  return false;
};

// Move node in local tree structure
export const moveTreeNode = (
  nodes: OrgTreeNode[],
  dragKey: string,
  dropKey: string,
  newManagerName: string
): OrgTreeNode[] => {
  const clone: OrgTreeNode[] = JSON.parse(JSON.stringify(nodes));
  let draggedNode: OrgTreeNode | null = null;

  // 1. Find and remove the dragged node from its old parent
  const removeAndExtract = (list: OrgTreeNode[]): OrgTreeNode[] => {
    return list.filter((item) => {
      if (item.key === dragKey) {
        draggedNode = { ...item, managerId: dropKey, managerName: newManagerName };
        return false;
      }
      if (item.children && item.children.length > 0) {
        const initialCount = item.children.length;
        item.children = removeAndExtract(item.children);
        if (item.children.length < initialCount) {
          item.directReportsCount = item.children.length;
        }
      }
      return true;
    });
  };

  const treeWithoutDragged = removeAndExtract(clone);

  if (!draggedNode) return nodes;

  // 2. Attach dragged node under dropKey parent
  const attachToParent = (list: OrgTreeNode[]): OrgTreeNode[] => {
    return list.map((item) => {
      if (item.key === dropKey) {
        const updatedChildren = [...(item.children || []), draggedNode!];
        return {
          ...item,
          children: updatedChildren,
          directReportsCount: updatedChildren.length,
        };
      }
      if (item.children && item.children.length > 0) {
        return {
          ...item,
          children: attachToParent(item.children),
        };
      }
      return item;
    });
  };

  return attachToParent(treeWithoutDragged);
};

// Filter tree based on search query, department, designation, status
export const filterTreeNodes = (
  nodes: OrgTreeNode[],
  query: string,
  deptFilter: string,
  statusFilter: string
): OrgTreeNode[] => {
  const q = query.toLowerCase().trim();

  return nodes.reduce<OrgTreeNode[]>((acc, node) => {
    const matchesSearch =
      !q ||
      node.name.toLowerCase().includes(q) ||
      node.employeeId.toLowerCase().includes(q) ||
      node.designation.toLowerCase().includes(q) ||
      node.department.toLowerCase().includes(q);

    const matchesDept = deptFilter === 'ALL' || node.department === deptFilter;
    const matchesStatus = statusFilter === 'ALL' || node.status === statusFilter;

    const childMatches = filterTreeNodes(node.children || [], query, deptFilter, statusFilter);

    if ((matchesSearch && matchesDept && matchesStatus) || childMatches.length > 0) {
      acc.push({
        ...node,
        children: childMatches,
      });
    }

    return acc;
  }, []);
};

// Get all keys in tree (for Expand All)
export const getAllTreeKeys = (nodes: OrgTreeNode[]): string[] => {
  const keys: string[] = [];
  const traverse = (list: OrgTreeNode[]) => {
    for (const node of list) {
      keys.push(node.key);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  };
  traverse(nodes);
  return keys;
};
