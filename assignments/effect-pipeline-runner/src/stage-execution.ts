import { Effect } from "effect"
import { runJob } from "./job-execution"
import type { PipelinePolicy, Stage, StageResult } from "./model"

export const runStage = (
  stage: Stage,
  policy: PipelinePolicy
): Effect.Effect<StageResult> =>
  Effect.gen(function* () {
    const jobs = yield* Effect.forEach(stage.jobs, runJob, {
      concurrency: policy.maxConcurrency
    })

    return {
      name: stage.name,
      jobs
    }
  })
