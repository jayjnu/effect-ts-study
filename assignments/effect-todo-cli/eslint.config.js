import {
  baseConfigs,
  domainConfig,
  layersConfig,
  platformBoundaryConfigs,
  programsConfig,
  servicesConfig
} from "eslint-config-effect"

export default [
  {
    ignores: ["node_modules/**"]
  },
  ...baseConfigs,
  ...platformBoundaryConfigs,
  domainConfig,
  servicesConfig,
  programsConfig,
  layersConfig
]
