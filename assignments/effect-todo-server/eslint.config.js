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
  // 과제 2 서버 adapter/server/main은 @effect/platform import를 허용한다.
  // domain/services/programs/layers는 여전히 platform boundary 강제.
  {
    files: ["src/main.ts", "src/adapters/**/*.ts", "src/server/**/*.ts"],
    rules: {
      "no-restricted-syntax": "off"
    }
  },
  domainConfig,
  servicesConfig,
  programsConfig,
  layersConfig
]
