/**
 * Makes horizontally scrollable documentation regions reachable by keyboard.
 *
 * Starlight can render wide code blocks and tables as pointer-scrollable
 * regions. Axe correctly requires an explicit focus target so keyboard-only
 * users can scroll the same content.
 */
export default function rehypeFocusableScrollRegions() {
  return (tree) => {
    visitElements(tree, (node) => {
      if (node.tagName !== 'pre' && node.tagName !== 'table') return

      node.properties ??= {}
      node.properties.tabIndex = 0
    })
  }
}

function visitElements(node, visitor) {
  if (!node || typeof node !== 'object') return

  if (node.type === 'element') {
    visitor(node)
  }

  if (!Array.isArray(node.children)) return

  for (const child of node.children) {
    visitElements(child, visitor)
  }
}
