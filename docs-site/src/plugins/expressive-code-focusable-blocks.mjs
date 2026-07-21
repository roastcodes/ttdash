/** Adds a keyboard focus target to Expressive Code's scrollable `<pre>`. */
export default {
  name: 'TTDash accessible code blocks',
  hooks: {
    postprocessRenderedBlock({ renderData }) {
      visitElements(renderData.blockAst, (node) => {
        if (node.tagName !== 'pre') return

        node.properties ??= {}
        node.properties.tabIndex = 0
      })
    },
  },
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
