import {
  nodeBuiltinPattern,
  nodeProtocolPattern,
  platformNodePattern,
  restrictedSourceSelectors
} from "../selectors.js"

const outputSideEffectMessage = "Return renderable values; do not write output in domain/services/programs/layers."
const dateMessage = "Use Effect Clock instead of Date in domain/services/programs/layers."

export const runtimeBoundarySelectors = [
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
