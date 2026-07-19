import { expect, it } from "@effect/vitest"
import { Duration, Effect, Ref, TestClock } from "effect"
import { CommandFailed } from "../src/errors"
import { runPipeline } from "../src/execution/pipeline-execution"
import type { Job, PipelinePolicy, Stage } from "../src/model"

const defaultPolicy: PipelinePolicy = {
  maxConcurrency: 2
}

const makeJob = (job: {
  readonly id: string
  readonly run: Job["run"]
  readonly cleanup: Job["cleanup"]
  readonly critical?: boolean
}): Job => ({
  id: job.id,
  policy: {
    critical: job.critical ?? false,
    maxRetries: 0,
    timeout: Duration.seconds(5)
  },
  run: job.run,
  cleanup: job.cleanup
})

it.effect("runs stages sequentially and preserves report order", () =>
  Effect.gen(function* () {
    const cleanups = yield* Ref.make(0)
    const stages: ReadonlyArray<Stage> = [
      {
        name: "install",
        jobs: [
          makeJob({
            id: "install",
            run: Effect.void,
            cleanup: Ref.update(cleanups, (count) => count + 1)
          })
        ]
      },
      {
        name: "checks",
        jobs: [
          makeJob({
            id: "lint",
            run: Effect.sleep("200 millis"),
            cleanup: Ref.update(cleanups, (count) => count + 1)
          }),
          makeJob({
            id: "test",
            run: Effect.sleep("100 millis"),
            cleanup: Ref.update(cleanups, (count) => count + 1)
          })
        ]
      }
    ]
    const fiber = yield* runPipeline(stages, defaultPolicy).pipe(Effect.fork)

    yield* TestClock.adjust("200 millis")
    const report = yield* fiber

    expect(report).toEqual({
      status: "Succeeded",
      stages: [
        {
          name: "install",
          jobs: [{ id: "install", status: "Succeeded", attempts: 1 }]
        },
        {
          name: "checks",
          jobs: [
            { id: "lint", status: "Succeeded", attempts: 1 },
            { id: "test", status: "Succeeded", attempts: 1 }
          ]
        }
      ]
    })
    expect(yield* Ref.get(cleanups)).toBe(3)
  }))

it.effect("continues after non-critical failures and reports warnings", () =>
  Effect.gen(function* () {
    const failure = new CommandFailed({
      jobId: "lint",
      reason: "eslint failed"
    })
    const stages: ReadonlyArray<Stage> = [
      {
        name: "checks",
        jobs: [
          makeJob({
            id: "lint",
            run: Effect.fail(failure),
            cleanup: Effect.void
          })
        ]
      },
      {
        name: "build",
        jobs: [
          makeJob({
            id: "build",
            run: Effect.void,
            cleanup: Effect.void,
            critical: true
          })
        ]
      }
    ]

    const report = yield* runPipeline(stages, defaultPolicy)

    expect(report).toEqual({
      status: "SucceededWithWarnings",
      stages: [
        {
          name: "checks",
          jobs: [{ id: "lint", status: "Failed", attempts: 1, error: failure }]
        },
        {
          name: "build",
          jobs: [{ id: "build", status: "Succeeded", attempts: 1 }]
        }
      ]
    })
  }))

it.effect("skips later stages after a critical failure", () =>
  Effect.gen(function* () {
    const deployCleanups = yield* Ref.make(0)
    const failure = new CommandFailed({
      jobId: "test",
      reason: "unit test failed"
    })
    const stages: ReadonlyArray<Stage> = [
      {
        name: "checks",
        jobs: [
          makeJob({
            id: "test",
            run: Effect.sleep("100 millis").pipe(Effect.zipRight(Effect.fail(failure))),
            cleanup: Effect.void,
            critical: true
          }),
          makeJob({
            id: "lint",
            run: Effect.sleep("10 seconds"),
            cleanup: Effect.void
          })
        ]
      },
      {
        name: "deploy",
        jobs: [
          makeJob({
            id: "deploy",
            run: Effect.void,
            cleanup: Ref.update(deployCleanups, (count) => count + 1),
            critical: true
          })
        ]
      }
    ]
    const fiber = yield* runPipeline(stages, defaultPolicy).pipe(Effect.fork)

    yield* Effect.yieldNow()
    yield* TestClock.adjust("100 millis")
    const report = yield* fiber

    expect(report).toEqual({
      status: "Failed",
      stages: [
        {
          name: "checks",
          jobs: [
            { id: "test", status: "Failed", attempts: 1, error: failure },
            { id: "lint", status: "Interrupted", attempts: 1 }
          ]
        },
        {
          name: "deploy",
          jobs: [{ id: "deploy", status: "Skipped", attempts: 0 }]
        }
      ]
    })
    expect(yield* Ref.get(deployCleanups)).toBe(0)
  }))
