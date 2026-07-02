# Spec: Effect Todo CLI 손코딩 과제

## 목표

Todo CLI라는 작은 문제로 Effect.ts 생태계의 핵심 개념을 직접 손으로 익힌다.

## 필수 요구사항

### CLI 기능

- `add`: todo 생성
- `list`: todo 목록 출력
- `done <id>`: todo 완료 처리
- `import <file>`: 줄 단위 todo title import

### CLI 구성

- CLI parser/router는 `@effect/cli`의 `Command`, `Args`를 사용한다.
- command interface는 `src/cli` 아래에 둔다.
- `add`, `list`, `done`, `import`는 각각 별도 command 파일로 분리한다.
- `src/main.ts`는 runtime entrypoint 역할만 담당한다.
- expected CLI parser failure는 concise message로 렌더링하고 non-zero로 종료한다.
- subcommand handler는 business program을 호출하고 renderable value만 출력한다.

### Layer dependency direction

ESLint로 아래 방향을 강제한다.

```txt
domain <- services <- programs
                  <- layers
```

- `domain`은 `services`, `programs`, `layers`를 import하지 않는다.
- `services`는 `programs`, `layers`를 import하지 않는다.
- `programs`와 `layers`는 서로 import하지 않는다.

### Layer responsibilities

각 디렉토리는 Effect의 다른 부분을 연습한다.

| 디렉토리 | 역할 | 여기서 필요한 Effect |
| --- | --- | --- |
| `domain` | Todo 타입, `Schema`, tagged error, 순수 생성/검증 규칙 | 가능하면 plain value/function. 필요하면 `Effect<Todo, ParseError, never>`처럼 의존성 없는 검증 Effect만 둔다. `Context`, `Layer`, platform 접근은 금지한다. |
| `services` | `TodoRepository`, `IdGenerator` 같은 service interface와 `Context.Tag` | 구현하지 않고 effect signature를 정의한다. 예: `add: (todo) => Effect<Todo, StorageError>` / `nextId: Effect<TodoId, never>`. |
| `programs` | `addTodo`, `listTodos`, `doneTodo`, `importTodos` use case | `Effect.gen`으로 service를 `yield*` 해서 조합한다. 반환 타입은 대략 `Effect<Result, DomainError | StorageError, TodoRepository | IdGenerator | Clock>`처럼 요구 service가 R channel에 남는다. 출력/파일/Node 직접 접근은 하지 않는다. |
| `layers` | service 구현과 wiring | `Layer.succeed`, `Layer.effect`, `Layer.scoped`로 service 구현을 제공한다. file-backed 구현은 `@effect/platform`의 `FileSystem` 등을 사용하고, resource cleanup이 필요하면 `Scope`/`Effect.acquireRelease`를 쓴다. `programs`를 import하지 않는다. |

CLI는 `src/cli/*`에서 args를 parse하고 program 결과를 출력 형태로 바꾼다. `src/main.ts`는 CLI runtime, top-level error handling, exit-code wiring을 담당하고 business logic은 담지 않는다.

### Effect 사용

- command program은 `Effect.gen`과 `yield*`로 작성한다.
- 저장소는 `TodoRepository` `Context.Tag`로 정의한다.
- file-backed repository와 in-memory repository를 `Layer`로 교체할 수 있어야 한다.
- id 생성은 숨은 global 호출이 아니라 injected service 또는 Effect service로 처리한다.

### Platform boundary

- domain/services/programs/layers에서 `node:fs`, `node:path`, `process`를 직접 쓰지 않는다.
- file/path 접근은 `@effect/platform`을 사용한다.
- `@effect/platform-node`는 `main.ts` runtime wiring에서만 사용한다.
- config는 `process.env` 대신 `Config`로 읽는다.
- 시간은 `Date`/`Date.now()` 대신 `Clock`에서 가져온다.
- id/random은 `Math.random()`/`crypto.randomUUID()` 대신 주입한다.
- command/program/business logic은 출력 side effect를 직접 수행하지 않고 renderable value를 반환한다.
- 실제 출력은 `main.ts` 또는 CLI adapter에서만 Effect Console/logging으로 처리한다.

ESLint로 가능한 정적 제약은 강제한다: layer 역방향 import, `@effect/platform-node`의 `main.ts` 밖 사용, Node builtin import, `process`, `Date`/`Date.now()`, `Math.random()`, `crypto.randomUUID()`, business layer의 출력 side effect. typed error 매핑처럼 런타임 의미가 필요한 규칙은 구현/리뷰로 확인한다.

### Error model

- `TodoNotFound`
- parse/storage error
- platform read/write/config path failure를 typed error로 매핑한다.
- known error는 CLI에서 짧은 사용자 메시지로 렌더링한다.

### Storage/resource safety

- Todo 저장은 JSON 파일 하나로 충분하다.
- 저장 전후 Schema validation을 한다.
- file-backed repository의 모든 write(`add`, `done`, `import` batch)는 batch 또는 serialized write로 JSON file race를 피한다.
- transient storage write failure에만 bounded `Schedule` retry를 적용한다.
- 모든 file-backed write에서 작은 lock/temp file 같은 scoped resource를 하나 두고 `Scope` 또는 `Effect.acquireRelease` cleanup을 반드시 사용한다.

## 가벼운 검증 가이드

heavy test framework 없이 작은 smoke script나 수동 실행 로그 하나면 충분하다.

현재 scaffold는 `src/main.ts` runtime entrypoint와 `src/cli/*` placeholder subcommands만 제공한다. repository와 Todo business logic 구현은 과제 수행 단계에서 작성한다.

- `pnpm typecheck`로 TypeScript wiring을 확인한다.
- `pnpm lint`로 layer dependency direction을 확인한다.
- `pnpm todo --help`로 `@effect/cli` parser wiring을 확인한다.
- `pnpm todo unknown`이 concise error를 출력하고 non-zero로 종료하는지 확인한다.
- `pnpm todo add "Effect 공부하기"`로 add command placeholder wiring을 확인한다.
- Todo error 처리 구현 뒤 `pnpm todo done missing`이 friendly error를 출력하고 non-zero로 종료하는지 확인한다.
- file-backed Layer 구현 뒤 같은 add/done/list program을 file Layer와 memory Layer에 각각 주입해 결과가 같은지 확인한다.

## 완료 기준

- 네 명령이 동작한다.
- file Layer와 memory Layer가 같은 program에 교체 주입된다.
- expected failure가 throw가 아니라 typed error로 보인다.
- `tsc --noEmit`이 통과한다.
