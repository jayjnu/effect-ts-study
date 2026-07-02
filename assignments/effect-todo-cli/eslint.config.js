import js from "@eslint/js"
import { builtinModules } from "node:module"
import tseslint from "typescript-eslint"

const layerMessage = (owner, layer) =>
  `${owner} must not depend on ${layer}. Allowed direction: domain <- services <- programs/layers.`

const staticImportExportNodes = ["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"]
const parentImportPattern = /(?:\.\/+)?\.\.\/+(?:.*\/+)?/.source
const srcImportPattern = /src\/+/.source
const aliasImportPattern = /@\/+/.source
const importPathEndPattern = /(?:\/|$)/.source
const nodeBuiltinPattern = new RegExp(
  `^(?:${builtinModules
    .filter((module) => !module.startsWith("_"))
    .map((module) => module.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})(?:/|$)`
).source
const nodeProtocolPattern = /^node:/.source
const platformNodePattern = /^@effect\/platform-node(?:\/|$)/.source
const platformPattern = /^@effect\/platform(?:\/|$)/.source
const outputSideEffectMessage = "Return renderable values; do not write output in domain/services/programs/layers."
const dateMessage = "Use Effect Clock instead of Date in domain/services/programs/layers."

const sourceSelector = (node, pattern) => `${node}[source.value=/${pattern}/]`

const staticImportExportSelector = (node, layer) => {
  const layerEnd = `${layer}${importPathEndPattern}`
  const pattern = [
    `${parentImportPattern}${layerEnd}`,
    `${srcImportPattern}${layerEnd}`,
    `${aliasImportPattern}${layerEnd}`
  ].join("|")

  return sourceSelector(node, `^(?:${pattern})`)
}

const restrictedSourceSelectors = (pattern, message) =>
  staticImportExportNodes.map((node) => ({
    selector: sourceSelector(node, pattern),
    message
  }))

const restrictedModuleSelectors = (pattern, message) => [
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

const layerDependencySelectors = (owner, layers) =>
  layers.flatMap((layer) =>
    staticImportExportNodes.map((node) => ({
      selector: staticImportExportSelector(node, layer),
      message: layerMessage(owner, layer)
    }))
  )

const noLayerRuntimeEscapes = [
  {
    selector: "ImportExpression",
    message: "Dynamic imports are not allowed in domain/services/programs/layers."
  },
  {
    selector: "TSImportType",
    message: "TypeScript import type queries are not allowed in domain/services/programs/layers."
  },
  ...restrictedSourceSelectors(nodeBuiltinPattern, "Use @effect/platform or an injected service instead of Node built-ins in domain/services/programs/layers."),
  ...restrictedSourceSelectors(nodeProtocolPattern, "Use @effect/platform or an injected service instead of Node built-ins in domain/services/programs/layers."),
  ...restrictedSourceSelectors(platformNodePattern, "@effect/platform-node is only allowed in src/main.ts."),
  {
    selector: "Identifier[name='process']",
    message: "Use Effect Config or the CLI/main boundary instead of process in domain/services/programs/layers."
  },
  {
    selector: "NewExpression[callee.name='Date']",
    message: dateMessage
  },
  {
    selector: "CallExpression[callee.name='Date']",
    message: dateMessage
  },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: "Use Effect Clock instead of Date.now in domain/services/programs/layers."
  },
  {
    selector: "NewExpression[callee.object.name='globalThis'][callee.property.name='Date']",
    message: dateMessage
  },
  {
    selector: "CallExpression[callee.object.object.name='globalThis'][callee.object.property.name='Date'][callee.property.name='now']",
    message: "Use Effect Clock instead of Date.now in domain/services/programs/layers."
  },
  {
    selector: "CallExpression[callee.object.name='globalThis'][callee.property.name='Date']",
    message: dateMessage
  },
  {
    selector: "VariableDeclarator[init.name='Date']",
    message: dateMessage
  },
  {
    selector: "VariableDeclarator[init.object.name='globalThis'][init.property.name='Date']",
    message: dateMessage
  },
  {
    selector: "VariableDeclarator[init.object.name='Date'][init.property.name='now']",
    message: "Use Effect Clock instead of Date.now in domain/services/programs/layers."
  },
  {
    selector: "VariableDeclarator[init.object.object.name='globalThis'][init.object.property.name='Date'][init.property.name='now']",
    message: "Use Effect Clock instead of Date.now in domain/services/programs/layers."
  },
  {
    selector: "VariableDeclarator[id.type='ObjectPattern'][init.name='Date']",
    message: dateMessage
  },
  {
    selector: "VariableDeclarator[id.type='ObjectPattern'][init.object.name='globalThis'][init.property.name='Date']",
    message: dateMessage
  },
  {
    selector: "VariableDeclarator[id.type='ObjectPattern'][init.name='globalThis'] Property[key.name='Date']",
    message: dateMessage
  },
  {
    selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
    message: "Inject an id/random service instead of Math.random in domain/services/programs/layers."
  },
  {
    selector: "CallExpression[callee.object.object.name='globalThis'][callee.object.property.name='Math'][callee.property.name='random']",
    message: "Inject an id/random service instead of Math.random in domain/services/programs/layers."
  },
  {
    selector: "CallExpression[callee.object.name='crypto'][callee.property.name='randomUUID']",
    message: "Inject an id/random service instead of crypto.randomUUID in domain/services/programs/layers."
  },
  {
    selector: "CallExpression[callee.object.object.name='globalThis'][callee.object.property.name='crypto'][callee.property.name='randomUUID']",
    message: "Inject an id/random service instead of crypto.randomUUID in domain/services/programs/layers."
  },
  {
    selector: "MemberExpression[object.name='console']",
    message: outputSideEffectMessage
  },
  {
    selector: "MemberExpression[object.object.name='globalThis'][object.property.name='console']",
    message: outputSideEffectMessage
  },
  {
    selector: "VariableDeclarator[init.name='console']",
    message: outputSideEffectMessage
  },
  {
    selector: "VariableDeclarator[init.object.name='console']",
    message: outputSideEffectMessage
  },
  {
    selector: "VariableDeclarator[init.object.name='globalThis'][init.property.name='console']",
    message: outputSideEffectMessage
  },
  {
    selector: "VariableDeclarator[init.object.object.name='globalThis'][init.object.property.name='console']",
    message: outputSideEffectMessage
  },
  {
    selector: "VariableDeclarator[init.name='globalThis'] Property[key.name='console']",
    message: outputSideEffectMessage
  },
  {
    selector: "ImportDeclaration[source.value='effect'] ImportSpecifier[imported.name='Console']",
    message: "Use Effect Console only in CLI/main adapters, not in domain/services/programs/layers."
  },
  {
    selector: "MemberExpression[object.object.name='Effect'][object.property.name='Console']",
    message: "Use Effect Console only in CLI/main adapters, not in domain/services/programs/layers."
  }
]

const platformNodeSelectors = restrictedModuleSelectors(
  platformNodePattern,
  "@effect/platform-node is only allowed in src/main.ts."
)

const platformImportSelectors = restrictedModuleSelectors(
  platformPattern,
  "Use @effect/platform only in layer implementations."
)

const domainOnlySelectors = [
  {
    selector: "ImportDeclaration[source.value='effect'] ImportSpecifier[imported.name=/^(Context|Layer)$/]",
    message: "domain must stay pure: do not import Context or Layer."
  },
  ...platformImportSelectors
]

const serviceProgramSelectors = platformImportSelectors

const restrictedSyntax = (...selectors) => ({
  "no-restricted-syntax": ["error", ...selectors.flat()]
})

const layerRules = (owner, forbiddenLayers, extraSelectors = []) =>
  restrictedSyntax(layerDependencySelectors(owner, forbiddenLayers), noLayerRuntimeEscapes, extraSelectors)

export default [
  {
    ignores: ["node_modules/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/main.ts"],
    rules: restrictedSyntax(platformImportSelectors)
  },
  {
    files: ["src/layers/**/*.ts"],
    rules: restrictedSyntax(platformNodeSelectors)
  },
  {
    files: ["src/**/*.ts"],
    ignores: ["src/main.ts", "src/layers/**/*.ts"],
    rules: restrictedSyntax(platformNodeSelectors, platformImportSelectors)
  },
  {
    files: ["src/domain/**/*.ts"],
    rules: layerRules("domain", ["services", "programs", "layers"], domainOnlySelectors)
  },
  {
    files: ["src/services/**/*.ts"],
    rules: layerRules("services", ["programs", "layers"], serviceProgramSelectors)
  },
  {
    files: ["src/programs/**/*.ts"],
    rules: layerRules("programs", ["layers"], serviceProgramSelectors)
  },
  {
    files: ["src/layers/**/*.ts"],
    rules: layerRules("layers", ["programs"])
  }
]
