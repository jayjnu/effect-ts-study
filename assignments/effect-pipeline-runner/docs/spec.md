# Structured Concurrency Pipeline Runner

## 1. 과제 목적

작은 CI pipeline runner를 순수 Effect로 구현한다.

이번 과제의 중심은 다음 네 가지다.

- Parent/child/sibling Fiber 관계
- Critical failure가 sibling에게 전파되는 방식
- Timeout/interruption과 typed failure의 차이
- 성공, 실패, 중단에서 resource cleanup을 보장하는 방법

`Context.Tag`, `Layer`, HTTP, DB는 사용하지 않는다. Domain model도 제공한다. Boilerplate보다 Effect 실행 의미를 이해하는 데 시간을 쓴다.

### 예상 시간

- 필수 범위: 60~90분
- Stretch 범위: 별도 30~60분

---

## 2. Pipeline 동작

Stage는 입력 순서대로 실행한다.

같은 Stage의 Job은 sibling Fiber로 실행한다. 이전 Stage가 끝나야 다음 Stage를 시작한다.

```text
install
↓
lint ─┬─ sibling Fiber
 test ─┘
↓
build
↓
deploy
```

실제 shell command는 실행하지 않는다. Job 동작은 `Effect` 값으로 만든다.

---

## 3. 참고 Domain model

아래 model은 시작할 때 참고하는 예시다. 그대로 복사할 필요는 없다. 학습자가 더 단순하거나 명확한 형태로 바꿔도 된다.

단, 필수 scenario에 필요한 `critical`, retry, timeout 정책과 실행 결과는 표현할 수 있어야 한다. Model의 모양보다 Effect의 failure/interruption 처리가 평가 대상이다.

```ts
import { Duration, Effect } from "effect"

export interface JobPolicy {
  readonly critical: boolean
  readonly maxRetries: number
  readonly timeout: Duration.Duration
}

export interface Job {
  readonly id: string
  readonly policy: JobPolicy
  readonly run: Effect.Effect<void, JobExecutionError>
  readonly cleanup: Effect.Effect<void>
}

export interface Stage {
  readonly name: string
  readonly jobs: ReadonlyArray<Job>
}

export interface PipelinePolicy {
  readonly maxConcurrency: number
}
```

### Status

```ts
export type JobStatus =
  | "Succeeded"
  | "Failed"
  | "TimedOut"
  | "Interrupted"
  | "Skipped"

export type PipelineStatus =
  | "Succeeded"
  | "SucceededWithWarnings"
  | "Failed"
```

### Result

```ts
export interface JobResult {
  readonly id: string
  readonly status: JobStatus
  readonly attempts: number
  readonly error?: JobExecutionError
}

export interface StageResult {
  readonly name: string
  readonly jobs: ReadonlyArray<JobResult>
}

export interface PipelineReport {
  readonly status: PipelineStatus
  readonly stages: ReadonlyArray<StageResult>
}
```

### Result 불변식

- Report 순서는 완료 순서가 아닌 입력 순서를 유지한다.
- `Skipped` Job은 `attempts=0`이다.
- `Skipped` Job에는 `error`가 없다.
- 시작하지 않은 `Skipped` Job은 cleanup을 실행하지 않는다.

---

## 4. 참고 Error model

이름과 field는 바꿔도 된다. Typed error와 `_tag` 구분이 유지되면 된다.

```ts
import { Data } from "effect"

export class TransientCommandError extends Data.TaggedError(
  "TransientCommandError"
)<{
  readonly jobId: string
  readonly reason: string
}> {}

export class CommandFailed extends Data.TaggedError("CommandFailed")<{
  readonly jobId: string
  readonly reason: string
}> {}

export class JobTimedOut extends Data.TaggedError("JobTimedOut")<{
  readonly jobId: string
  readonly timeoutMillis: number
}> {}

export type JobExecutionError =
  | TransientCommandError
  | CommandFailed
  | JobTimedOut
```

### Error 정책

- `TransientCommandError`만 retry한다.
- `maxRetries=2`면 최초 실행을 포함해 최대 3회 시도한다.
- `CommandFailed`는 retry하지 않는다.
- Timeout은 retry하지 않는다.
- 마지막 error의 `_tag`, `jobId`, `reason`을 보존한다.
- `throw`, 문자열 error, `unknown` 변환을 사용하지 않는다.

---

## 5. 참고 Public API

아래 signature는 추천 형태다. 같은 실행 정책과 결과를 표현할 수 있다면 다른 API로 설계해도 된다.

```ts
export const runPipeline = (
  stages: ReadonlyArray<Stage>,
  policy: PipelinePolicy
): Effect.Effect<PipelineReport>
```

### 중요한 의미

- Job의 expected failure는 내부 `E` channel에 유지한다.
- Critical/non-critical 정책을 결정하는 boundary에서 `JobResult` 값으로 변환한다.
- Job failure로 pipeline이 정상 종료되면 `PipelineReport`를 반환한다.
- 외부에서 Pipeline Fiber 자체를 interrupt하면 report를 반환하지 않는다. Pipeline Effect는 interrupted exit로 끝난다.
- Parent interruption test는 report가 아니라 child cleanup/interruption을 검증한다.

내부 함수 이름과 signature는 직접 정한다.

권장 분리:

```text
runJob
runStage
runPipeline
makeSkippedResult
summarizePipeline
```

---

## 6. 실행 정책

### 동시 실행

- 같은 Stage의 Job만 동시에 실행한다.
- 실행 수는 `PipelinePolicy.maxConcurrency`를 넘지 않는다.
- 값은 hard coding하지 않는다.

### Non-critical failure

- 해당 Job을 `Failed` 또는 `TimedOut`으로 기록한다.
- Sibling은 계속 실행한다.
- 다음 Stage도 실행한다.
- 최종 Pipeline status는 `SucceededWithWarnings`다.

### Critical failure

- Retry가 끝난 뒤에도 실패하면 critical failure로 확정한다.
- 실행 중인 sibling Fiber를 interrupt한다.
- 같은 Stage에서 아직 시작하지 않은 Job은 `Skipped`다.
- 이후 Stage의 모든 Job도 `Skipped`다.
- 최종 Pipeline status는 `Failed`다.

### Parent interruption

- Pipeline/Stage Fiber가 interrupt되면 실행 중인 child Fiber도 중단되어야 한다.
- `forkDaemon`을 사용하지 않는다.
- Parent 종료 뒤 child 작업이 계속 실행되면 실패다.

### Cleanup

- 시작한 Job은 성공, 실패, timeout, interruption 모두 cleanup을 정확히 1회 실행한다.
- Retry 전체를 Job 실행 하나로 본다.
- Finalizer는 retry 대상 Effect 바깥에 둔다.
- Retry attempt 안에 finalizer를 두어 cleanup이 여러 번 실행되면 실패다.
- `Skipped` Job cleanup은 0회다.

### Timeout

- Timeout은 Job별 `policy.timeout`을 사용한다.
- Timeout outward 결과는 `JobTimedOut`이다.
- 실행 중이던 inner Job Fiber는 interrupt되어야 한다.
- Test에서는 실제 시간을 기다리지 않고 `TestClock`을 사용한다.

---

## 7. Effect semantics 주의사항

### `Effect.all` / `Effect.forEach` fail-fast

Failure가 `E` channel에 남아 있으면 기본 fail-fast가 sibling을 interrupt할 수 있다.

- Critical failure에는 이 동작이 필요하다.
- Non-critical failure는 sibling을 중단하면 안 된다.
- 따라서 어느 지점에서 failure를 `JobResult` 값으로 바꿀지 직접 결정해야 한다.

### Interruption

Interruption은 `CommandFailed` 같은 typed error가 아니다.

- `catchTag`만으로 처리할 수 없다.
- `Exit` 또는 `Cause`를 보고 interrupted 상태를 판별해야 한다.
- Child가 interrupt되면 Child 자신이 `JobResult`를 반환한다고 가정하지 않는다. Parent가 Child `Exit`을 보고 `Interrupted` result를 만들 수 있다.

### `TestClock`

- Sleep/timeout Effect를 먼저 실행하거나 fork한다.
- 그 뒤 `TestClock.adjust`로 virtual time을 진행한다.
- 실제 `setTimeout`과 실제 시간 대기를 사용하지 않는다.

---

## 8. 필수로 사용할 Effect Core

- `Effect.gen`, `yield*`
- `Effect.fail`
- `Data.TaggedError`
- `Effect.retry`, `Schedule`
- `Effect.timeoutFail`
- `Effect.ensuring` 또는 `Effect.acquireRelease`
- `Effect.all`, `Effect.forEach`, `Effect.fork` 중 필요한 structured concurrency API
- `Fiber.await`, `Fiber.join`, `Fiber.interrupt` 중 필요한 Fiber API
- `Effect.exit`, `Exit`
- 필요한 경우 `Cause`
- `Ref`
- `TestClock`

### Stretch에서 사용할 것

- `FiberRef`
- `Effect.onInterrupt`
- 세밀한 `Cause` 분석

---

## 9. 사용하지 말아야 할 것

- `Promise.all`, `new Promise`
- orchestration을 위한 `async/await`
- `setTimeout`
- `try/catch`, `throw`
- `forkDaemon`
- mutable global variable
- mutable result array와 `push`
- `as any`
- expected error를 제거하는 `Effect.orDie`
- error 정보를 잃는 `catchAll(() => Effect.void)`
- 실제 shell command
- HTTP, DB, file I/O
- `Context.Tag`, `Layer`
- `Queue`, `Stream`, `STM`

---

## 10. 필수 Test scenario

필수 test는 7개다. 실제 시간을 기다리면 안 된다.

### Scenario 1. 전체 성공과 순서 보존

Given:

```text
Stage 1: install
Stage 2: lint, test
Stage 3: build
```

Then:

- Pipeline은 `Succeeded`다.
- 모든 Job은 `Succeeded`다.
- 모든 `attempts`는 1이다.
- Cleanup은 Job마다 1회다.
- 완료 순서와 관계없이 report 순서는 입력 순서다.

### Scenario 2. 최대 동시 실행 수

Given:

- 같은 Stage에 Job 4개가 있다.
- `maxConcurrency=2`다.
- 각 Job은 `Clock.sleep`으로 대기한다.

Then:

- 최대 active Job 수는 2다.
- 첫 Job이 끝나기 전에 두 번째 Job도 시작된다.
- 4개 Job이 모두 성공한다.

`Ref`로 `active`, `maxActive`를 측정한다.

### Scenario 3. Transient retry

두 경우를 한 test file에서 검증한다.

Case A:

```text
1회 TransientCommandError
2회 TransientCommandError
3회 성공
maxRetries=2
```

- Status는 `Succeeded`다.
- `attempts=3`이다.
- Cleanup은 1회다.

Case B:

- 매번 `TransientCommandError`다.
- Job은 non-critical이다.

- 총 3회 실행한다.
- Status는 `Failed`다.
- 마지막 error 정보를 보존한다.
- 다음 Stage는 계속 실행한다.
- Pipeline은 `SucceededWithWarnings`다.

### Scenario 4. Permanent non-critical failure

Given:

```text
lint: critical=false, CommandFailed
 test: critical=true, 성공
build: 다음 Stage
```

Then:

- lint는 한 번만 실행하고 `Failed`다.
- test는 `Succeeded`다.
- build를 실행한다.
- Pipeline은 `SucceededWithWarnings`다.

### Scenario 5. Critical failure와 sibling interruption

Given:

```text
 test: critical=true, 100ms 후 CommandFailed
 lint: critical=false, 10초 sleep
build: 다음 Stage
```

Test는 Effect를 먼저 실행/fork한 뒤 `TestClock.adjust(100 millis)`를 호출한다.

Then:

- test는 `Failed`다.
- 실행 중이던 lint는 `Interrupted`다.
- lint cleanup은 1회다.
- build는 `Skipped`, `attempts=0`, cleanup 0회다.
- Pipeline은 `Failed`다.

### Scenario 6. Critical timeout

Given:

```text
build 실행: 10초 sleep
build timeout: 500ms
build critical: true
deploy: 다음 Stage
```

Test는 실행을 시작한 뒤 `TestClock.adjust(500 millis)`를 호출한다.

Then:

- build는 `TimedOut`이다.
- `attempts=1`이다.
- cleanup은 1회다.
- deploy는 `Skipped`다.
- Pipeline은 `Failed`다.

### Scenario 7. Parent interruption

Given:

- 오래 실행되는 child Job 3개가 있다.
- Pipeline/Stage Fiber를 외부에서 interrupt한다.

Then:

- 실행 중인 child가 모두 interrupt된다.
- 시작한 child cleanup은 각각 1회다.
- `active` Ref가 최종 0이다.
- Parent interruption은 `PipelineReport`가 아니라 interrupted `Exit`으로 확인한다.

`active=0`과 cleanup count로 orphan이 없음을 간접 검증한다. Runtime 내부 Fiber 목록을 직접 검사하지 않는다.

---

## 11. Stretch scenario

필수 7개가 끝난 뒤 선택한다.

### Stretch A. Non-critical timeout

- Non-critical Job이 timeout되어도 sibling과 다음 Stage가 계속 실행된다.
- Pipeline은 `SucceededWithWarnings`다.

### Stretch B. FiberRef 상속과 sibling 격리

- Parent의 `pipelineId`를 child가 상속한다.
- Sibling은 각자 `jobId`를 locally 설정한다.
- `Ref<Array<{ pipelineId; jobId }>>` test sink로 값을 수집한다.
- Sibling끼리 `jobId`가 섞이지 않는다.

### Stretch C. Cleanup matrix

다음 상태를 table test로 검증한다.

- Succeeded
- Failed
- TimedOut
- Interrupted
- Skipped

### Stretch D. 완료 순서와 report 순서

```text
job-a: 300ms
job-b: 100ms
job-c: 200ms
```

완료 순서는 `b → c → a`, report 순서는 `a → b → c`인지 검증한다.

### Stretch E. `Effect.all` fail-fast 비교

같은 Job들을 다음 두 방식으로 실행하고 차이를 설명한다.

- Failure를 `E` channel에 유지
- Failure를 먼저 `JobResult` 값으로 변환

Sibling interruption 결과가 왜 달라지는지 test와 주석으로 남긴다.

---

## 12. 추천 구현 순서

### 1단계: `runJob`

- attempts
- retry
- timeout
- cleanup
- JobResult/error boundary

### 2단계: `runStage`

- sibling 실행
- concurrency 제한
- non-critical failure 격리
- critical failure 전파
- sibling interruption

### 3단계: `runPipeline`

- Stage 순차 실행
- 이후 Stage skip
- Pipeline status 계산
- 입력 순서 report

### 4단계: Parent interruption

- Child cleanup
- active count 0
- interrupted Exit

---

## 13. 완료 기준

- 필수 scenario 7개가 모두 통과한다.
- `pnpm test`, `pnpm typecheck`, `pnpm lint`가 통과한다.
- 실제 시간에 의존하는 test가 없다.
- Expected error는 정책 boundary 전까지 `E` channel에 남는다.
- Critical failure가 실행 중인 sibling을 중단한다.
- Non-critical failure는 sibling을 중단하지 않는다.
- Parent interruption이 child까지 전파된다.
- 시작한 Job의 cleanup이 정확히 한 번 실행된다.
- Pipeline 종료 후 `active=0`이다.
- Report는 immutable data이며 입력 순서를 유지한다.
- 주석은 API 번역보다 failure/interruption 정책의 이유를 설명한다.

---

## 14. 제출 전 설명할 수 있어야 하는 것

- Fiber와 JavaScript thread의 차이
- Parent/child/sibling Fiber 관계
- `Effect.all` fail-fast가 sibling에 미치는 영향
- Typed failure와 interruption의 차이
- Interrupted child가 일반 성공값을 반환하지 않는 이유
- Parent가 `Exit`을 보고 `Interrupted` result를 만드는 이유
- Finalizer를 retry 안쪽에 두면 cleanup이 여러 번 실행되는 이유
- `TestClock`에서 Effect를 먼저 시작한 뒤 시간을 진행해야 하는 이유
- Structured concurrency가 orphan Fiber를 줄이는 방식

---

## 15. 공식 문서

- Fibers: https://effect.website/docs/concurrency/fibers/
- Basic Concurrency: https://effect.website/docs/concurrency/basic-concurrency/
- Error Management: https://effect.website/docs/error-management/
- Resource Management: https://effect.website/docs/resource-management/introduction/
- Schedule: https://effect.website/docs/scheduling/built-in-schedules/
- Runtime: https://effect.website/docs/runtime/
