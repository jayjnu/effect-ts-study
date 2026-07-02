import js from "@eslint/js"
import tseslint from "typescript-eslint"
import { restrictedSyntax } from "./selectors.js"
import { domainPuritySelectors } from "./rules/domain-purity.js"
import { layerDependencySelectors } from "./rules/layer-dependencies.js"
import { platformImportSelectors, platformNodeSelectors } from "./rules/platform-boundary.js"
import { runtimeBoundarySelectors } from "./rules/runtime-boundary.js"

export const baseConfigs = [js.configs.recommended, ...tseslint.configs.recommended]

export const platformBoundaryConfigs = [
  {
    files: ["src/main.ts"],
    rules: restrictedSyntax(platformImportSelectors)
  },
  {
    files: ["src/**/*.ts"],
    ignores: ["src/main.ts", "src/layers/**/*.ts"],
    rules: restrictedSyntax(platformNodeSelectors, platformImportSelectors)
  }
]

export const layerRules = (owner, forbiddenLayers, extraSelectors = []) =>
  restrictedSyntax(layerDependencySelectors(owner, forbiddenLayers), runtimeBoundarySelectors, extraSelectors)

export const domainConfig = {
  files: ["src/domain/**/*.ts"],
  rules: layerRules("domain", ["services", "programs", "layers"], domainPuritySelectors)
}

export const servicesConfig = {
  files: ["src/services/**/*.ts"],
  rules: layerRules("services", ["programs", "layers"], platformImportSelectors)
}

export const programsConfig = {
  files: ["src/programs/**/*.ts"],
  rules: layerRules("programs", ["layers"], platformImportSelectors)
}

export const layersConfig = {
  files: ["src/layers/**/*.ts"],
  rules: layerRules("layers", ["programs"])
}

export const effectArchitectureConfigs = [
  ...platformBoundaryConfigs,
  domainConfig,
  servicesConfig,
  programsConfig,
  layersConfig
]

export default [
  {
    ignores: ["node_modules/**"]
  },
  ...baseConfigs,
  ...effectArchitectureConfigs
]
