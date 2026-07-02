import { builtinModules } from "node:module"

export const staticImportExportNodes = ["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"]

export const parentImportPattern = /(?:\.\/+)?\.\.\/+(?:.*\/+)?/.source
export const srcImportPattern = /src\/+/.source
export const aliasImportPattern = /@\/+/.source
export const importPathEndPattern = /(?:\/|$)/.source

export const nodeBuiltinPattern = new RegExp(
  `^(?:${builtinModules
    .filter((module) => !module.startsWith("_"))
    .map((module) => module.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})(?:/|$)`
).source

export const nodeProtocolPattern = /^node:/.source
export const platformNodePattern = /^@effect\/platform-node(?:\/|$)/.source
export const platformPattern = /^@effect\/platform(?:\/|$)/.source

export const sourceSelector = (node, pattern) => `${node}[source.value=/${pattern}/]`

export const restrictedSourceSelectors = (pattern, message) =>
  staticImportExportNodes.map((node) => ({
    selector: sourceSelector(node, pattern),
    message
  }))

export const restrictedModuleSelectors = (pattern, message) => [
  ...restrictedSourceSelectors(pattern, message),
  {
    selector: sourceSelector("ImportExpression", pattern),
    message
  },
  {
    selector: `TSImportType[argument.value=/${pattern}/]`,
    message
  },
  {
    selector: `TSImportType[argument.literal.value=/${pattern}/]`,
    message
  },
  {
    selector: `TSImportType[argument.expression.value=/${pattern}/]`,
    message
  }
]

export const restrictedSyntax = (...selectors) => ({
  "no-restricted-syntax": ["error", ...selectors.flat()]
})
