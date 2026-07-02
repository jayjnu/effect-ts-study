# Effect Todo CLI 손코딩 과제

## 과제 설명

작은 Todo CLI를 직접 손코딩하면서 Effect.ts 핵심 개념을 한 번씩 사용해본다.
기능보다 구조 학습이 목표다.

구현할 명령:

```bash
todo add "Effect 공부하기"
todo list
todo done <id>
todo import ./todos.txt
```

중점 학습:

- `@effect/cli`의 `Command` / `Args` 기반 CLI 구성
- `Effect.gen`
- `Context.Tag` / `Layer` 기반 DI
- `@effect/platform` 기반 platform agnostic code
- `@effect/platform-node` entrypoint 분리
- ESLint로 `domain <- services <- programs/layers` 의존성 방향 강제
- typed error, `Schema`, `Config`, `Clock`, `Schedule`, `Scope`

## 프로젝트 세팅 방법

이미 pnpm 패키지 scaffold가 생성되어 있다.

```bash
cd assignments/effect-todo-cli
pnpm install
```

현재는 TypeScript 에러가 나지 않는 최소 entrypoint, `src/cli` command interface, 디렉토리 구조만 남겨둔다.

```txt
src/
  main.ts                # runtime entrypoint
  cli/
    index.ts             # root command
    add.ts
    list.ts
    done.ts
    import.ts
  domain/.gitkeep
  services/.gitkeep
  layers/.gitkeep
  programs/.gitkeep
```

`pnpm todo`는 `tsx src/main.ts`를 실행한다. production CLI packaging은 과제 범위 밖이다.

placeholder command는 바로 실행해볼 수 있다.

```bash
pnpm typecheck
pnpm lint
pnpm todo --help
pnpm todo add "Effect 공부하기"
pnpm todo list
pnpm todo done 1
pnpm todo import ./todos.txt
```

실제 Todo business logic, repository 구현은 과제 수행자가 직접 작성한다.
레이어별 책임과 각 위치에서 필요한 Effect 종류는 [Spec](./docs/spec.md)의 `Layer responsibilities`를 참고한다.

## Docs

- [Spec](./docs/spec.md)
