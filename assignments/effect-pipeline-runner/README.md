# Effect Structured Concurrency Pipeline Runner

과제 설명: [`docs/spec.md`](./docs/spec.md)

## Setup

Repo root에서:

```bash
pnpm install
```

## Commands

```bash
# 전체 과제 검증
pnpm --filter effect-pipeline-runner test
pnpm --filter effect-pipeline-runner typecheck
pnpm --filter effect-pipeline-runner lint

# 과제 directory 기준
pnpm -C assignments/effect-pipeline-runner test
pnpm -C assignments/effect-pipeline-runner typecheck
pnpm -C assignments/effect-pipeline-runner lint
```

## ESLint guardrails

`src/**/*.ts`에서 다음 패턴을 차단한다.

- `Promise.all`, `new Promise`, `async/await`
- `setTimeout`, `fetch`, `try/catch`, `throw`
- `Effect.forkDaemon`, `Effect.orDie`, `Effect.catchAll`
- `Effect.runPromise`, `Effect.runSync`, `Effect.runFork`
- `Array.push`, `as any`, module-level `let`
- `Date.now`, `Math.random`, `console`
- `Context`, `Layer`, `Queue`, `Stream`, `STM`
- `@effect/*`, Node built-in I/O import

금지 규칙은 `test/eslint-constraints.test.ts`에서 위반 fixture와 허용 fixture를 실제 ESLint로 검증한다.
