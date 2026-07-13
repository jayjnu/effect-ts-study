# Spec: Effect Todo HTTP/RPC Server 과제

## 목표

기존 Todo CLI 과제에서 익힌 `domain / services / programs / layers` 구조를 long-running server 환경으로 확장한다.
CLI에서는 잘 보이지 않았던 request boundary, request validation, typed error response, request context, DB transaction, audit logging을 작은 Todo 서버 안에서 직접 다룬다.

이번 과제의 핵심 보장은 다음과 같다.

```txt
성공한 Todo mutation은 같은 DB transaction 안에서 Todo 변경과 audit log append가 함께 commit되어야 한다.
```

이번 과제는 reliable audit log까지만 다룬다.
outbox, queue, fire-and-forget 같은 비동기 side effect는 범위 밖이다.

## 시나리오 한정

이번 과제에서는 audit log를 Todo와 동일한 DB 안에 저장한다고 가정한다.

- Todo state와 audit log는 같은 persistence boundary 안에 있다.
- audit log는 Todo state와 분리된 append-only 저장소에 남긴다.
- RDB를 사용한다면 `todos` 테이블과 별도의 `audit_logs` 테이블을 만든다.
- 성공한 mutation의 Todo 변경과 audit log append는 하나의 DB transaction으로 묶는다.
- audit log insert가 실패하면 API는 성공하면 안 된다.
- transaction commit/rollback은 DB에 맡긴다.
- 별도 audit service나 distributed transaction은 범위 밖이다.

## 필수 요구사항

### 서버 기능

HTTP 또는 RPC 중 하나를 선택해서 구현한다.
둘 다 구현할 필요는 없다.

HTTP를 선택한다면 아래 endpoint를 기본으로 한다.

- `POST /todos`: todo 생성
- `GET /todos`: todo 목록 조회
- `POST /todos/:id/complete`: todo 완료 처리
- `DELETE /todos/:id`: todo 삭제

RPC를 선택한다면 같은 의미의 operation을 제공한다.

- `createTodo`
- `listTodos`
- `completeTodo`
- `deleteTodo`

서버는 `pnpm dev`로 실제 실행 가능해야 한다.
기본 port는 `3000`처럼 고정값을 사용해도 되고, 혹은 `Config`로 `PORT`를 읽는다.

runtime wiring은 아래 책임이 섞이지 않으면 된다.

- `src/main.ts`: server effect 실행
- `src/server`: adapter와 Live Layer 조립, startup/shutdown 관리
- `src/adapters/http` 또는 `src/adapters/rpc`: request decode, request context 추출, response/error encode
- `src/layers`: DB client, repository, id generator 같은 concrete implementation 제공

HTTP server와 DB connection 같은 resource는 interrupt 시 정리되는 구조면 충분하다.

### 기존 CLI core 재사용
기존 CLI 과제의 core 구조를 최대한 유지한다.

- `domain`: Todo 타입, id/title schema, domain error
- `services`: repository, audit log, request context, id generator, 필요 시 transaction boundary 같은 service interface
- `programs`: Todo use case 조합
- `layers`: service 구현체와 runtime wiring
- `adapters/cli`: 기존 CLI command adapter

기존 CLI adapter는 `adapters/cli`로 옮겨서 보존하고, 새 서버 entrypoint는 `adapters/http` 또는 `adapters/rpc`로 구현한다.
`programs`는 HTTP header, status code, request body, response body를 직접 알지 않는다.

server 과제 scaffold는 CLI core 복사 스크립트를 제공한다.

```bash
pnpm copy:cli-core
```

이 스크립트는 `assignments/effect-todo-cli/src` 아래의 다음 디렉토리를 server 과제로 복사한다.

- `domain` -> `domain`
- `services` -> `services`
- `programs` -> `programs`
- `layers` -> `layers`
- `cli` -> `adapters/cli`

기본적으로 기존 server 과제 파일을 덮어쓰지 않는다.
의도적으로 다시 복사해야 한다면 `pnpm copy:cli-core -- --force`를 사용한다.

복사된 file-backed layer는 최종 답이 아니다.
이번 과제에서는 DB-backed repository, transaction runner, audit log layer로 교체해야 한다.
또한 기존 CLI core에는 delete use case가 없으므로, 서버 과제에서는 delete program과 repository method를 새로 추가한다.
`adapters/http`, `adapters/rpc`는 새 서버 adapter를 구현할 빈 디렉토리로 둔다.

### Request validation

외부에서 들어오는 request input은 adapter boundary에서 검증한다.
`Schema`를 사용하는 것을 권장하지만, 구현 방식은 선택할 수 있다.

검증 대상:

- request body
- path parameter
- query parameter가 있다면 query parameter
- header에서 읽는 request context 값

검증 실패는 표준 error response로 렌더링한다.

### Request context

모든 요청에는 `requestId`가 있다.

- `X-Request-Id` header가 있으면 사용한다.
- 없으면 서버가 생성한다.
- error response와 audit log에 포함한다.
- success response에 포함할지는 선택한다.

사용자 식별이 필요하면 `actorId`를 request context에 포함할 수 있다.

- 예: `X-Actor-Id` header를 읽거나 `anonymous` 기본값을 사용한다.
- `actorId`는 필수 인증 요구사항이 아니다.

request context는 adapter에서 추출하고, program에는 service 또는 명시적 input으로 전달한다.
program이 HTTP header를 직접 읽으면 안 된다.

### Audit log

Todo mutation command는 성공 시 audit log를 남긴다.
audit log는 Todo record와 같은 row에 섞어 저장하지 않고 별도 append-only 기록으로 저장한다.
RDB를 사용한다면 별도의 `audit_logs` 테이블을 만든다.
audit log의 내부 payload 형태는 자유롭게 정해도 된다.

아래와 같은 정보를 표현할 수 있어야 한다.

- `requestId`
- action: `CreateTodo`, `CompleteTodo`, `DeleteTodo`
- target: Todo id 또는 식별 가능한 값
- result: 필수 범위에서는 `Succeeded`
- reason: 실패/거절 로그까지 확장한다면 실패/거절 사유
- occurredAt
- (선택) actorId 또는 사용자 식별값이 있다면 포함

`Rejected` audit log는 선택 확장이다.
필수 범위는 successful mutation의 `Succeeded` audit log를 남기는 것이다.

원한다면 domain event나 command event를 만들어 audit log payload로 사용해도 된다.
다만 event modeling 자체는 필수 요구사항이 아니다.

### DB 사용

실제 DB를 사용한다.
DB 종류는 자유롭게 선택할 수 있지만, Todo 저장과 audit log 저장을 같은 transaction 안에서 처리할 수 있어야 한다.

추천은 SQLite와 `@effect/sql`이다.
PostgreSQL, MySQL 등을 사용해도 되지만 Docker, migration framework, ORM 학습이 과제의 중심을 빼앗지 않게 한다.

DB schema는 자유롭게 설계해도 된다.
다만 Todo의 현재 상태와 audit log 기록을 저장할 수 있어야 한다.

- `todos`: id, title, status, created/completed/deleted 시각
- `audit_logs`: requestId, action, target, result, reason, occurredAt, 선택 actorId/payload

DB 관련 구현은 `src/layers` 아래에 자유롭게 배치한다.
예를 들어 파일 수가 적으면 `sqlite-todo-repository.ts`처럼 flat하게 둘 수 있고, 많아지면 `layers/sqlite/` 같은 하위 디렉토리를 만들어도 된다.

마이그레이션, seed, schema 파일이 많아지면 선택적으로 `src/db`를 만들어 따로 관리해도 된다.

단, `src/db`를 두더라도 `programs`가 SQL query나 DB client를 직접 import하면 안 된다.
DB client와 SQL 구현 detail은 `layers` 또는 선택적으로 분리한 `db`에 둔다.

### Transaction boundary

성공한 mutation은 Todo 변경과 audit log 기록이 하나의 transaction 안에서 함께 성공해야 한다.

audit log 저장에 실패하면 API가 성공하면 안 된다.
같은 DB transaction을 사용하므로 Todo 변경도 commit되면 안 된다.

구현 방식은 자유롭게 선택해도 된다.
다만 리뷰하는 사람이 아래 보장을 확인할 수 있어야 한다.

- create/complete/delete 같은 mutation이 성공 응답을 반환했다면, 대응되는 audit log도 DB에 남아 있어야 한다.
- audit log insert가 실패하면 mutation도 rollback되어야 한다.
- transaction 경계가 어디인지 코드에서 추적 가능해야 한다.

가능한 구현 방식 예:

- `@effect/sql`의 transaction helper를 사용한다.
- `Transaction` service를 만들어 program에서 사용한다.
- repository method 내부에서 Todo 변경과 audit log append를 하나의 DB transaction으로 묶는다.

어떤 방식을 선택하든 HTTP/RPC adapter가 직접 transaction을 관리하지는 않는다.
adapter는 request를 decode하고 program을 호출하는 역할에 집중한다.

### 선택 확장: rejected/query audit

여유가 있다면 아래 action도 audit log에 남긴다.

- 존재하지 않는 Todo 완료 시도 같은 rejected action
- `GET /todos` 같은 query action

이 확장은 필수가 아니다.
필수 범위는 successful mutation의 Todo 변경과 audit log append를 같은 transaction으로 묶는 것이다.

### Error model

expected failure는 throw가 아니라 typed error로 모델링한다.
HTTP/RPC adapter는 typed error를 표준 error response로 변환한다.

예:

```txt
InvalidTodoTitle     -> 400 INVALID_TODO_TITLE
TodoNotFound         -> 404 TODO_NOT_FOUND
TodoAlreadyCompleted -> 409 TODO_ALREADY_COMPLETED
StorageError         -> 500 STORAGE_ERROR
```

DB connection failure, SQL syntax error, server startup failure처럼 사용자의 Todo command 자체가 아니라 서버/DB 실행 환경에서 난 오류는 domain error처럼 억지로 모델링하지 않아도 된다.
이런 오류는 infrastructure error로 감싸거나 structured log로 남기고, adapter에서 500 계열 error response로 변환하면 충분하다.

에러 처리 중 audit log를 남기려다가 또 실패할 수 있다.
이때는 원래 실패 원인, 예를 들어 `TodoNotFound`나 `StorageError`, 이 audit log 실패에 가려지지 않게 한다.
즉 API 응답과 로그에서 “무엇이 먼저 실패했는지”를 추적할 수 있어야 한다.

## Layer dependency direction

CLI 과제와 같은 방향을 유지한다.

```txt
domain <- services <- programs
                  <- layers
```

- `domain`은 `services`, `programs`, `layers`, `adapters`, `server`를 import하지 않는다.
- `services`는 `programs`, `layers`, `adapters`, `server`를 import하지 않는다.
- `programs`와 `layers`는 서로 import하지 않는다.
- HTTP/RPC adapter는 `programs`를 호출하고 결과를 response로 변환한다.
- DB implementation detail은 기본적으로 `layers`에 둔다. 필요하면 `db`를 선택적으로 분리해도 된다.

## Layer responsibilities

각 디렉토리는 Effect의 다른 부분을 연습한다.

| 디렉토리 | 역할 |
| --- | --- |
| `domain` | Todo 타입, domain schema, domain error |
| `services` | repository, audit log, request context, id generator 같은 service interface |
| `programs` | create/list/complete/delete use case |
| `layers` | service 구현체, DB-backed repository, transaction wiring |
| `adapters` | CLI/HTTP/RPC 같은 외부 진입점 |
| `server` | adapter와 Layer를 조립하는 server assembly |

## 디렉토리 배치 가이드

기본 구조는 작게 유지한다.

- HTTP와 RPC는 둘 중 하나만 구현한다. 둘 다 구현하는 것은 선택 확장이다.
- `adapters/cli`는 기존 CLI와 서버 boundary를 비교하기 위한 참고 구현이다. 서버 과제 완료 기준은 선택한 HTTP/RPC adapter에서 만족한다.
- DB 구현은 기본적으로 `layers` 아래에 둔다. `src/db`는 migration/seed/schema 파일이 많아졌을 때만 선택적으로 만든다.
- `utils` 또는 `lib` 디렉토리는 기본으로 만들지 않는다. 두 곳 이상에서 실제 중복이 생겼을 때만 만든다.

## Platform boundary

- domain/services/programs에서 `node:fs`, `node:http`, `process`, `Date.now()`, `Math.random()`, `crypto.randomUUID()`를 직접 쓰지 않는다.
- 시간은 `Clock`에서 가져온다.
- id/random은 injected service로 처리한다.
- DB client와 HTTP server implementation은 runtime adapter 또는 layer에서만 다룬다.
- program은 response body를 직접 만들지 않고 renderable result 또는 domain result를 반환한다.
- 실제 HTTP status code, response body, RPC error mapping은 adapter에서 처리한다.

## 추천 구현 순서

1. `pnpm copy:cli-core`로 CLI core와 CLI adapter를 가져온다.
2. file-backed layer를 DB-backed layer로 바꾼다.
3. audit log와 transaction 요구사항을 programs/layers에 반영한다.
4. HTTP 또는 RPC adapter 중 하나를 구현한다.
5. integration test 또는 수동 실행 로그로 핵심 보장을 확인한다.

## 가벼운 검증 가이드

heavy test framework 없이 작은 integration test나 수동 실행 로그 하나면 충분하다.

- `pnpm typecheck`로 TypeScript wiring을 확인한다.
- `pnpm lint`로 layer dependency direction을 확인한다.
- `pnpm test`로 핵심 program과 transaction 보장을 확인한다.
- server를 실행하고 create/list/complete/delete API가 실제로 호출되는지 확인한다.
- requestId가 error response와 audit log에 남는지 확인한다.
- validation failure가 표준 error response로 반환되는지 확인한다.
- audit log insert 실패를 의도적으로 만들었을 때 Todo mutation이 commit되지 않는지 확인한다.

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

audit log는 외부 API로 반드시 노출할 필요는 없다.
대신 integration test, DB query script, 또는 README의 재현 절차로 아래를 확인할 수 있어야 한다.

- 성공한 create/complete/delete mutation마다 `audit_logs`에 기록이 남는다.
- audit log insert가 실패하도록 만든 경우 Todo 변경도 commit되지 않는다.

## 완료 기준

- Todo create/list/complete/delete API가 동작한다.
- HTTP 또는 RPC 중 선택한 transport가 실제로 실행 가능하다.
- error response와 audit log에 `requestId`가 포함된다.
- successful mutation은 Todo 변경과 audit log append가 같은 DB transaction으로 처리된다.
- audit log 없는 successful mutation이 발생하지 않는다.
- expected failure가 throw가 아니라 typed error로 보인다.
- outbox, queue, fire-and-forget은 구현하지 않는다.
- `pnpm typecheck`가 통과한다.
- `pnpm lint`가 통과한다.
- `pnpm test`가 통과한다.
