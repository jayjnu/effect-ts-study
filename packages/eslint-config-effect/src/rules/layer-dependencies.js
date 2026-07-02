import {
  aliasImportPattern,
  importPathEndPattern,
  parentImportPattern,
  sourceSelector,
  srcImportPattern,
  staticImportExportNodes
} from "../selectors.js"

const layerMessage = (owner, layer) =>
  `${owner} must not depend on ${layer}. Allowed direction: domain <- services <- programs/layers.`

const staticImportExportSelector = (node, layer) => {
  const layerEnd = `${layer}${importPathEndPattern}`
  const pattern = [
    `${parentImportPattern}${layerEnd}`,
    `${srcImportPattern}${layerEnd}`,
    `${aliasImportPattern}${layerEnd}`
  ].join("|")

  return sourceSelector(node, `^(?:${pattern})`)
}

export const layerDependencySelectors = (owner, layers) =>
  layers.flatMap((layer) =>
    staticImportExportNodes.map((node) => ({
      selector: staticImportExportSelector(node, layer),
      message: layerMessage(owner, layer)
    }))
  )
