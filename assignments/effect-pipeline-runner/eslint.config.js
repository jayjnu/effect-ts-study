import { baseConfigs } from "eslint-config-effect"

const restrictedSyntax = (...entries) => ({
  "no-restricted-syntax": ["error", ...entries]
})

const forbidCall = (object, property, message) => ({
  selector: `CallExpression[callee.object.name='${object}'][callee.property.name='${property}']`,
  message
})

const forbidMember = (object, property, message) => ({
  selector: `MemberExpression[object.name='${object}'][property.name='${property}']`,
  message
})

const exerciseRestrictions = restrictedSyntax(
  {
    selector: "CallExpression[callee.object.name='Promise'][callee.property.name='all']",
    message: "Promise.all 대신 Effect.all/Effect.forEach의 structured concurrency를 사용하세요."
  },
  {
    selector: "NewExpression[callee.name='Promise']",
    message: "new Promise 대신 Effect 생성자 또는 Effect.async를 사용하세요."
  },
  {
    selector: ":matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression)[async=true]",
    message: "async 함수 대신 Effect.gen으로 orchestration을 작성하세요."
  },
  {
    selector: "AwaitExpression",
    message: "await 대신 Effect.gen의 yield*를 사용하세요."
  },
  {
    selector: "CallExpression[callee.name='setTimeout']",
    message: "setTimeout 대신 Clock.sleep/Effect.sleep과 TestClock을 사용하세요."
  },
  {
    selector: "CallExpression[callee.name='fetch']",
    message: "이번 과제는 외부 HTTP I/O를 사용하지 않습니다."
  },
  {
    selector: "TryStatement",
    message: "try/catch 대신 Effect의 typed error channel을 사용하세요."
  },
  {
    selector: "ThrowStatement",
    message: "throw 대신 Effect.fail과 Data.TaggedError를 사용하세요."
  },
  {
    selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='push']",
    message: "mutable push 대신 immutable Array 연산을 사용하세요."
  },
  {
    selector: "TSAsExpression > TSAnyKeyword",
    message: "as any로 type/error 문제를 숨기지 마세요."
  },
  {
    selector: "Program > VariableDeclaration[kind='let']",
    message: "module-level mutable state를 만들지 마세요. Ref 또는 immutable value를 사용하세요."
  },
  {
    selector: "Program > ExportNamedDeclaration > VariableDeclaration[kind='let']",
    message: "module-level mutable state를 만들지 마세요. Ref 또는 immutable value를 사용하세요."
  },
  forbidMember("Effect", "forkDaemon", "forkDaemon은 parent supervision을 벗어납니다. structured child Fiber를 사용하세요."),
  forbidMember("Effect", "orDie", "Expected error를 orDie로 제거하지 마세요."),
  forbidMember("Effect", "catchAll", "이번 과제에서는 catchAll로 error 정보를 지우지 말고 catchTag/Exit/Cause를 사용하세요."),
  {
    selector: "MemberExpression[object.name='Effect'][property.name=/^run/]",
    message: "src에서 Effect.run*으로 별도 root Fiber를 만들지 마세요. Test/runtime boundary가 실행합니다."
  },
  forbidCall("Date", "now", "실제 시간 대신 Effect Clock을 사용하세요."),
  forbidCall("Math", "random", "비결정적 Math.random 대신 Effect Random을 사용하세요.")
)

export default [
  {
    ignores: ["node_modules/**", "dist/**"]
  },
  ...baseConfigs,
  {
    files: ["src/**/*.ts"],
    rules: {
      ...exerciseRestrictions,
      "no-console": "error",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "effect",
              importNames: ["Context", "Layer", "Queue", "Stream", "STM"],
              message: "이번 과제 범위에서는 Context/Layer/Queue/Stream/STM을 사용하지 않습니다."
            }
          ],
          patterns: [
            {
              group: ["@effect/*"],
              message: "src에서는 effect core package만 사용하세요."
            },
            {
              group: ["node:*", "fs", "fs/*", "http", "http/*", "child_process"],
              message: "이번 과제는 OS/file/HTTP/process I/O를 사용하지 않습니다."
            }
          ]
        }
      ]
    }
  }
]
