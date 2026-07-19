import { expect, it } from "@effect/vitest"
import { Duration, Effect, Ref, TestClock } from "effect"
import { CommandFailed } from "../src/model/job-error"
import { runStage } from "../src/execution/stage-execution"
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

it.effect("runs all jobs in a stage and preserves input order", () =>
  Effect.gen(function* () {
    const cleanups = yield* Ref.make(0)
    const stage: Stage = {
      name: "checks",
      jobs: [
        makeJob({
          id: "slow",
          run: Effect.sleep("300 millis"),
          cleanup: Ref.update(cleanups, (count) => count + 1)
        }),
        makeJob({
          id: "fast",
          run: Effect.sleep("100 millis"),
          cleanup: Ref.update(cleanups, (count) => count + 1)
        })
      ]
    }
    const fiber = yield* runStage(stage, defaultPolicy).pipe(Effect.fork)

    yield* TestClock.adjust("300 millis")
    const result = yield* fiber

    expect(result).toEqual({
      name: "checks",
      jobs: [
        { id: "slow", status: "Succeeded", attempts: 1 },
        { id: "fast", status: "Succeeded", attempts: 1 }
      ]
    })
    expect(yield* Ref.get(cleanups)).toBe(2)
  }))

it.effect("keeps sibling jobs running after a non-critical failure", () =>
  Effect.gen(function* () {
    const succeeded = yield* Ref.make(false)
    const failure = new CommandFailed({
      jobId: "lint",
      reason: "eslint failed"
    })
    const stage: Stage = {
      name: "checks",
      jobs: [
        makeJob({
          id: "lint",
          run: Effect.fail(failure),
          cleanup: Effect.void
        }),
        makeJob({
          id: "test",
          run: Ref.set(succeeded, true),
          cleanup: Effect.void,
          critical: true
        })
      ]
    }

    const result = yield* runStage(stage, defaultPolicy)

    expect(result).toEqual({
      name: "checks",
      jobs: [
        { id: "lint", status: "Failed", attempts: 1, error: failure },
        { id: "test", status: "Succeeded", attempts: 1 }
      ]
    })
    expect(yield* Ref.get(succeeded)).toBe(true)
  }))

it.effect("limits concurrent jobs using pipeline policy", () =>
  Effect.gen(function* () {
    const active = yield* Ref.make(0)
    const maxActive = yield* Ref.make(0)
    const makeMeasuredRun = Ref.updateAndGet(active, (count) => count + 1).pipe(
      Effect.flatMap((current) =>
        Ref.update(maxActive, (max) => Math.max(max, current))
      ),
      Effect.zipRight(Effect.sleep("1 second")),
      Effect.ensuring(Ref.update(active, (count) => count - 1))
    )
    const stage: Stage = {
      name: "parallel",
      jobs: ["a", "b", "c", "d"].map((id) =>
        makeJob({
          id,
          run: makeMeasuredRun,
          cleanup: Effect.void
        })
      )
    }
    const fiber = yield* runStage(stage, { maxConcurrency: 2 }).pipe(Effect.fork)

    yield* TestClock.adjust("2 seconds")
    const result = yield* fiber

    expect(yield* Ref.get(maxActive)).toBe(2)
    expect(yield* Ref.get(active)).toBe(0)
    expect(result.jobs.map((job) => job.status)).toEqual([
      "Succeeded",
      "Succeeded",
      "Succeeded",
      "Succeeded"
    ])
  }))

it.effect("interrupts running siblings and skips unstarted jobs after a critical failure", () =>
  Effect.gen(function* () {
    const lintCleanups = yield* Ref.make(0)
    const buildCleanups = yield* Ref.make(0)
    const failure = new CommandFailed({
      jobId: "test",
      reason: "unit test failed"
    })
    const stage: Stage = {
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
          cleanup: Ref.update(lintCleanups, (count) => count + 1)
        }),
        makeJob({
          id: "build",
          run: Effect.void,
          cleanup: Ref.update(buildCleanups, (count) => count + 1)
        })
      ]
    }
    const fiber = yield* runStage(stage, { maxConcurrency: 2 }).pipe(Effect.fork)

    yield* TestClock.adjust("100 millis")
    const result = yield* fiber

    expect(result).toEqual({
      name: "checks",
      jobs: [
        { id: "test", status: "Failed", attempts: 1, error: failure },
        { id: "lint", status: "Interrupted", attempts: 1 },
        { id: "build", status: "Skipped", attempts: 0 }
      ]
    })
    expect(yield* Ref.get(lintCleanups)).toBe(1)
    expect(yield* Ref.get(buildCleanups)).toBe(0)
  }))
