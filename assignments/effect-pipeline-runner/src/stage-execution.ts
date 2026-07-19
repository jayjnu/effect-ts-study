import { Effect, Option, Ref } from "effect"
import { runJob } from "./job-execution"
import {
  isEscalatableJobResult,
  makeInterruptedJobResult,
  makeSkippedJobResult
} from "./model"
import type { Job, JobResult, PipelinePolicy, Stage, StageResult } from "./model"

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

    yield* Effect.forEach(
      stage.jobs.map((job, index) => ({ index, job })),
      ({ index, job }) => runStageJob(index, job, results, started),
      {
        concurrency: policy.maxConcurrency
      }
    ).pipe(Effect.exit)

    const recordedResults = yield* Ref.get(results)
    const startedJobs = yield* Ref.get(started)

    return {
      name: stage.name,
      jobs: stage.jobs.map((job, index) =>
        makeRecordedOrPendingResult(job, index, recordedResults, startedJobs)
      )
    }
  })

const runStageJob = (
  index: number,
  job: Job,
  results: Ref.Ref<ReadonlyArray<Option.Option<JobResult>>>,
  started: Ref.Ref<ReadonlyArray<boolean>>
) =>
  Effect.gen(function* () {
    yield* Ref.update(started, replaceAt(index, true))

    const result = yield* runJob(job)

    yield* Ref.update(results, replaceAt(index, Option.some(result)))

    return shouldAbortStage(job, result) ? yield* Effect.fail(result) : result
  })

const shouldAbortStage = (job: Job, result: JobResult): boolean =>
  job.policy.critical && isEscalatableJobResult(result)

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
