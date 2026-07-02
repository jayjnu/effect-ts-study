import {
  platformNodePattern,
  platformPattern,
  restrictedModuleSelectors
} from "../selectors.js"

const platformNodeMessage = "@effect/platform-node is only allowed in src/main.ts."
const platformMessage = "Use @effect/platform only in layer implementations."

export const platformNodeSelectors = restrictedModuleSelectors(platformNodePattern, platformNodeMessage)
export const platformImportSelectors = restrictedModuleSelectors(platformPattern, platformMessage)
