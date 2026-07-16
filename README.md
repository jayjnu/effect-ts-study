# effect-ts-study
agent driven 시대에 중요한 것은 깨지지 않는 강력한 구조, expected/recoverable error를 type/error channel에 명시하는 것. Effect.ts를 이용하여 agent 친화적 개발을 해보자

## 개발환경

```bash
mise trust
mise install
mise run install
mise run lint
mise run typecheck
```

- Node/pnpm 버전은 [`mise.toml`](./mise.toml)에서 고정한다.
- 의존성 버전은 [`pnpm-workspace.yaml`](./pnpm-workspace.yaml)의 `catalog`에서 관리한다.

## 과제

- [Effect Todo CLI 손코딩 과제](./assignments/effect-todo-cli/README.md)
- [Effect Todo HTTP/RPC Server 과제](./assignments/effect-todo-server/README.md)
- [Effect Structured Concurrency Pipeline Runner](./assignments/effect-pipeline-runner/README.md)
