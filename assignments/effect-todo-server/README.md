# Effect Todo HTTP/RPC Server 과제

## Docs

- [Spec](./docs/spec.md)

## 과제 설명

기존 Todo CLI 과제에서 만든 `domain / services / programs / layers` 구조를 버리지 않고, HTTP 또는 RPC 서버로 확장해본다.
핵심은 단순 Todo CRUD 서버가 아니라, 서버 환경에서 필요한 request validation, typed error, requestId, DB transaction, audit log를 Effect 방식으로 다뤄보는 것이다.

이번 과제는 outbox, queue, fire-and-forget을 다루지 않는다.
Todo 변경과 audit log 기록을 동일 DB transaction 안에서 함께 성공 또는 실패하게 만드는 것이 중심이다.

HTTP를 선택한다면 구현할 API:

```bash
POST /todos
GET /todos
POST /todos/:id/complete
DELETE /todos/:id
```

RPC를 선택한다면 같은 의미의 `createTodo`, `listTodos`, `completeTodo`, `deleteTodo` operation을 제공한다.

## 이 과제를 통해 배우는 것

이번 과제는 Todo CRUD보다, `Effect<A, E, R>`와 `Layer`를 사용해 서버 프로그램을 조립하고 실행 환경을 교체하는 경험에 초점을 둔다.

- `Effect<A, E, R>`로 성공, 실패, 의존성을 분리해서 생각하기
- `Effect.gen`으로 domain validation, repository call, audit logging을 하나의 program으로 조합하기
- throw 대신 typed error channel로 예상 가능한 실패를 표현하기
- `Schema`로 외부 request를 안전한 domain value로 변환하기
- `Context.Tag`와 `Layer`로 service interface와 구현체를 분리하기
- Layer composition으로 file/in-memory 구현을 DB-backed 구현으로 교체하기
- `Scope`와 Layer lifecycle로 HTTP server와 DB connection resource 관리하기
- transaction boundary를 effectful program으로 모델링하기
- fake/test Layer를 주입해 성공, 실패, rollback 시나리오 검증하기

## 프로젝트 세팅 방법

repo는 pnpm workspace로 구성되어 있다. 루트에서 의존성을 설치한다.

```bash
pnpm install
cd assignments/effect-todo-server
```

현재 scaffold는 TypeScript 에러가 나지 않는 최소 entrypoint와 디렉토리 구조만 제공한다.

```txt
src/
  main.ts
  server/
  adapters/
    cli/
    http/
    rpc/
  domain/
  services/
  programs/
  layers/
```

기존 CLI 과제를 완료했다면 `assignments/effect-todo-cli/src/domain`, `services`, `programs`, `layers`, `cli`의 설계를 참고하거나 복사해서 시작해도 된다.
단, file repository 중심 구현은 DB-backed repository와 transaction boundary로 교체해야 한다.

CLI 과제에서 만든 core 디렉토리와 CLI adapter를 그대로 가져오고 싶다면 아래 스크립트를 사용할 수 있다.

```bash
# assignments/effect-todo-server 디렉토리에서
pnpm copy:cli-core

# repo root에서
pnpm --filter effect-todo-server copy:cli-core
```

이 스크립트는 `cli`를 `src/adapters/cli` 아래로 복사한다.
`src/adapters/http`, `src/adapters/rpc`는 새 서버 adapter를 구현할 빈 디렉토리로 남겨둔다.

이미 server 과제 쪽 `domain`, `services`, `programs`, `layers`, `adapters/cli`에 작업한 파일이 있으면 기본적으로 덮어쓰지 않는다.
의도적으로 다시 복사하려면 다음처럼 실행한다.

```bash
# assignments/effect-todo-server 디렉토리에서
pnpm copy:cli-core -- --force

# repo root에서
pnpm --filter effect-todo-server copy:cli-core -- --force
```

이 스크립트는 시작점만 만들어준다.
복사 후에는 file-backed layer를 DB-backed transaction/audit layer로 바꾸는 것이 이번 과제의 핵심이다.
기존 CLI core에는 delete use case가 없으므로, 서버 과제에서는 delete program과 repository method를 새로 추가한다.

placeholder entrypoint는 바로 실행해볼 수 있다.

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm dev
```

실제 Todo API, DB schema, transaction 구현은 과제 수행자가 직접 작성한다.
DB-backed repository, transaction, audit log 구현은 `src/layers` 아래에 자유롭게 배치한다.
파일이 많아지면 `src/layers/sqlite` 같은 하위 디렉토리를 만들거나, 선택적으로 `src/db`를 만들어 DB 관련 파일만 따로 관리해도 된다.
레이어별 책임과 세부 요구사항은 [Spec](./docs/spec.md)을 참고한다.

## 완료 기준

기본 검증 명령이 통과해야 한다.

```bash
pnpm typecheck
pnpm lint
pnpm test
```

선택한 transport가 실제 서버를 대상으로 호출 가능해야 한다.

HTTP를 선택했다면 `pnpm dev`로 서버를 띄운 뒤 아래 흐름을 `curl`로 재현한다.

```bash
curl -i -X POST http://localhost:3000/todos \
  -H 'content-type: application/json' \
  -H 'x-request-id: req-create-1' \
  -d '{"title":"learn Effect server"}'

curl -i http://localhost:3000/todos \
  -H 'x-request-id: req-list-1'

curl -i -X POST http://localhost:3000/todos/<todo-id>/complete \
  -H 'x-request-id: req-complete-1'

curl -i -X DELETE http://localhost:3000/todos/<todo-id> \
  -H 'x-request-id: req-delete-1'
```

RPC를 선택했다면 같은 흐름을 실제 서버에 호출하는 client script나 integration test를 제공한다.

audit log는 별도 조회 API로 노출하지 않아도 된다.
대신 test, DB query script, 또는 README 재현 절차로 successful mutation의 Todo 변경과 `audit_logs` insert가 같은 transaction 안에서 함께 성공/실패함을 보여준다.

## 구현 메모

- transport: HTTP (`@effect/platform` `HttpRouter` + `@effect/platform-node` `NodeHttpServer`).
- DB: SQLite via `@effect/sql` + `@effect/sql-sqlite-node` (`better-sqlite3`).
  - `disableWAL: true` — 일부 filesystem(iCloud 동기화 디렉토리 등)에서 WAL이 disk I/O error를 낸다.
- transaction: `Transaction` service가 `SqlClient.withTransaction`에 위임. program은 DB client를 모른다.
- port: `PORT` 환경변수(기본 3000). `PORT=3001 pnpm dev`.

### 실행 및 curl 재현

```bash
pnpm dev                       # PORT=3001 pnpm dev 로 포트 변경 가능
curl -i -X POST http://127.0.0.1:3000/todos \
  -H 'content-type: application/json' -H 'x-request-id: req-create-1' \
  -d '{"title":"learn Effect server"}'
curl -i http://127.0.0.1:3000/todos -H 'x-request-id: req-list-1'
curl -i -X POST http://127.0.0.1:3000/todos/<id>/complete -H 'x-request-id: req-complete-1'
curl -i -X DELETE http://127.0.0.1:3000/todos/<id> -H 'x-request-id: req-delete-1'
```

### transaction 보장 검증

`test/todo.test.ts`가 핵심 보장을 검증한다.

- `createTodo writes todo and audit log in one transaction`: 성공 mutation마다 `todos`와 `audit_logs`가 함께 남는다.
- `audit log insert failure rolls back todo creation`: 실패하는 AuditLog를 주입하면 `createTodo`가 `StorageError`로 실패하고 todo 변경도 rollback된다.
- expected failure(`TodoNotFound`, `TodoAlreadyCompleted`)는 typed error channel로 흐른다.
