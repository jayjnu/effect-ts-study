import { Effect, Fiber, Option, Ref } from "effect"
import { runJob } from "./job-execution"
import { shouldAbortStage } from "../policy/stage-failure-policy"
import {
  makeInterruptedJobResult,
  makeSkippedJobResult
} from "../model/job-result"
import type { Job, JobResult, PipelinePolicy, Stage, StageResult } from "../model"

interface RunningJob {
  readonly index: number
  readonly job: Job
  readonly fiber: Fiber.Fiber<JobResult, never>
}

interface PendingJob {
  readonly index: number
  readonly job: Job
}

export const runStage = (
  stage: Stage,
  policy: PipelinePolicy
): Effect.Effect<StageResult> =>
  Effect.gen(function* () {
    const results = yield* Ref.make<ReadonlyArray<Option.Option<JobResult>>>(
      stage.jobs.map((): Option.Option<JobResult> => Option.none())
    )
    const started = yield* Ref.make<ReadonlyArray<boolean>>(
      stage.jobs.map(() => false)
    )

    const initialJobs = stage.jobs
      .slice(0, policy.maxConcurrency)
      .map((job, index) => ({ index, job }))
    const pendingJobs = stage.jobs
      .slice(policy.maxConcurrency)
      .map((job, pendingIndex) => ({
        index: pendingIndex + policy.maxConcurrency,
        job
      }))
    const runningJobs = yield* Effect.forEach(initialJobs, ({ index, job }) =>
      forkStageJob(index, job, results, started)
    )

    yield* waitForRunningJobs(runningJobs, pendingJobs, results, started)

    const recordedResults = yield* Ref.get(results)
    const startedJobs = yield* Ref.get(started)

    return {
      name: stage.name,
      jobs: stage.jobs.map((job, index) =>
        makeRecordedOrPendingResult(job, index, recordedResults, startedJobs)
      )
    }
  })

const forkStageJob = (
  index: number,
  job: Job,
  results: Ref.Ref<ReadonlyArray<Option.Option<JobResult>>>,
  started: Ref.Ref<ReadonlyArray<boolean>>
) =>
  Effect.gen(function* () {
    yield* Ref.update(started, replaceAt(index, true))
    const fiber = yield* runStageJob(index, job, results).pipe(Effect.fork)

    return {
      index,
      job,
      fiber
    }
  })

const runStageJob = (
  index: number,
  job: Job,
  results: Ref.Ref<ReadonlyArray<Option.Option<JobResult>>>
) =>
  Effect.gen(function* () {
    const result = yield* runJob(job)

    yield* Ref.update(results, replaceAt(index, Option.some(result)))

    return result
  })

const waitForRunningJobs = (
  runningJobs: ReadonlyArray<RunningJob>,
  pendingJobs: ReadonlyArray<PendingJob>,
  results: Ref.Ref<ReadonlyArray<Option.Option<JobResult>>>,
  started: Ref.Ref<ReadonlyArray<boolean>>
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const [firstRunningJob] = runningJobs

    if (firstRunningJob === undefined) {
      return
    }

    const completed = yield* Effect.raceAll(
      runningJobs.map((runningJob) =>
        Fiber.join(runningJob.fiber).pipe(
          Effect.map((result) => ({
            runningJob,
            result
          }))
        )
      )
    )

    const remainingRunningJobs = runningJobs.filter(
      (runningJob) => runningJob.index !== completed.runningJob.index
    )

    if (shouldAbortStage(completed.runningJob.job, completed.result)) {
      yield* Effect.forEach(remainingRunningJobs, (runningJob) =>
        Fiber.interrupt(runningJob.fiber)
      )
      return
    }

    const [nextPendingJob, ...remainingPendingJobs] = pendingJobs
    const nextRunningJobs =
      nextPendingJob === undefined
        ? remainingRunningJobs
        : [
            ...remainingRunningJobs,
            yield* forkStageJob(
              nextPendingJob.index,
              nextPendingJob.job,
              results,
              started
            )
          ]

    yield* waitForRunningJobs(
      nextRunningJobs,
      remainingPendingJobs,
      results,
      started
    )
  })

const makeRecordedOrPendingResult = (
  job: Job,
  index: number,
  results: ReadonlyArray<Option.Option<JobResult>>,
  started: ReadonlyArray<boolean>
): JobResult =>
  Option.match(results[index] ?? Option.none(), {
    onNone: () =>
      started[index] === true
        ? makeInterruptedJobResult(job, 1)
        : makeSkippedJobResult(job),
    onSome: (result) => result
  })

const replaceAt =
  <A>(index: number, value: A) =>
  (values: ReadonlyArray<A>): ReadonlyArray<A> =>
    values.map((current, currentIndex) =>
      currentIndex === index ? value : current
    )
