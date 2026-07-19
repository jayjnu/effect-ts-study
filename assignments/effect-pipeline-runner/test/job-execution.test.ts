import { expect, it } from "@effect/vitest"
import { Duration, Effect, Ref, TestClock } from "effect"
import {
  CommandFailed,
  JobTimedOut,
  TransientCommandError
} from "../src/errors"
import { runJob } from "../src/execution/job-execution"
import type { Job } from "../src/model"

const makePolicy = (overrides: Partial<Job["policy"]> = {}): Job["policy"] => ({
  critical: false,
  maxRetries: 0,
  timeout: Duration.seconds(5),
  ...overrides
})

it.effect("retries transient failures and records a successful result", () =>
  Effect.gen(function* () {
    const attempts = yield* Ref.make(0)
    const cleanups = yield* Ref.make(0)
    const job: Job = {
      id: "test",
      policy: makePolicy({ maxRetries: 2 }),
      run: Ref.updateAndGet(attempts, (count) => count + 1).pipe(
        Effect.flatMap((attempt) =>
          attempt < 3
            ? Effect.fail(
                new TransientCommandError({
                  jobId: "test",
                  reason: `transient-${attempt}`
                })
              )
            : Effect.void
        )
      ),
      cleanup: Ref.update(cleanups, (count) => count + 1)
    }

    const result = yield* runJob(job)

    expect(result).toEqual({
      id: "test",
      status: "Succeeded",
      attempts: 3
    })
    expect(yield* Ref.get(attempts)).toBe(3)
    expect(yield* Ref.get(cleanups)).toBe(1)
  }))

it.effect("does not retry permanent failures and preserves the error", () =>
  Effect.gen(function* () {
    const attempts = yield* Ref.make(0)
    const cleanups = yield* Ref.make(0)
    const error = new CommandFailed({
      jobId: "lint",
      reason: "eslint failed"
    })
    const job: Job = {
      id: "lint",
      policy: makePolicy({ maxRetries: 2 }),
      run: Ref.update(attempts, (count) => count + 1).pipe(
        Effect.zipRight(Effect.fail(error))
      ),
      cleanup: Ref.update(cleanups, (count) => count + 1)
    }

    const result = yield* runJob(job)

    expect(result).toEqual({
      id: "lint",
      status: "Failed",
      attempts: 1,
      error
    })
    expect(yield* Ref.get(attempts)).toBe(1)
    expect(yield* Ref.get(cleanups)).toBe(1)
  }))

it.effect("stops after max retries and preserves the last transient error", () =>
  Effect.gen(function* () {
    const attempts = yield* Ref.make(0)
    const cleanups = yield* Ref.make(0)
    const job: Job = {
      id: "publish",
      policy: makePolicy({ maxRetries: 2 }),
      run: Ref.updateAndGet(attempts, (count) => count + 1).pipe(
        Effect.flatMap((attempt) =>
          Effect.fail(
            new TransientCommandError({
              jobId: "publish",
              reason: `transient-${attempt}`
            })
          )
        )
      ),
      cleanup: Ref.update(cleanups, (count) => count + 1)
    }

    const result = yield* runJob(job)

    expect(result).toEqual({
      id: "publish",
      status: "Failed",
      attempts: 3,
      error: new TransientCommandError({
        jobId: "publish",
        reason: "transient-3"
      })
    })
    expect(yield* Ref.get(attempts)).toBe(3)
    expect(yield* Ref.get(cleanups)).toBe(1)
  }))

it.effect("times out a long-running job and runs cleanup once", () =>
  Effect.gen(function* () {
    const attempts = yield* Ref.make(0)
    const cleanups = yield* Ref.make(0)
    const fiber = yield* runJob({
      id: "build",
      policy: makePolicy({ timeout: Duration.millis(500) }),
      run: Ref.update(attempts, (count) => count + 1).pipe(
        Effect.zipRight(Effect.sleep("10 seconds"))
      ),
      cleanup: Ref.update(cleanups, (count) => count + 1)
    }).pipe(Effect.fork)

    yield* TestClock.adjust("500 millis")
    const result = yield* fiber

    expect(result).toEqual({
      id: "build",
      status: "TimedOut",
      attempts: 1,
      error: new JobTimedOut({
        jobId: "build",
        timeoutMillis: 500
      })
    })
    expect(yield* Ref.get(attempts)).toBe(1)
    expect(yield* Ref.get(cleanups)).toBe(1)
  }))
