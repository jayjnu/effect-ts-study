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
