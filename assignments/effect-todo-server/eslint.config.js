import {
  baseConfigs,
  domainConfig,
  layersConfig,
  programsConfig,
  servicesConfig
} from "eslint-config-effect"

export default [
  {
    ignores: ["node_modules/**"]
  },
  ...baseConfigs,
  domainConfig,
  servicesConfig,
  programsConfig,
  layersConfig
]
