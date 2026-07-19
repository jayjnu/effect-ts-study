import { Effect } from "effect"
import { runStage } from "./stage-execution"
import {
  isEscalatableJobResult,
  makeSkippedJobResult
} from "./model"
import type {
  JobResult,
  PipelinePolicy,
  PipelineReport,
  PipelineStatus,
  Stage,
  StageResult
} from "./model"

export const runPipeline = (
  stages: ReadonlyArray<Stage>,
  policy: PipelinePolicy
): Effect.Effect<PipelineReport> =>
  Effect.gen(function* () {
    const reportStages = yield* runPipelineStages(stages, policy)

    return {
      status: summarizePipeline(reportStages),
      stages: reportStages
    }
  })

const runPipelineStages = (
  stages: ReadonlyArray<Stage>,
  policy: PipelinePolicy
): Effect.Effect<ReadonlyArray<StageResult>> =>
  Effect.gen(function* () {
    const [stage, ...remainingStages] = stages

    if (stage === undefined) {
      return []
    }

    const result = yield* runStage(stage, policy)

    if (shouldStopPipeline(stage, result)) {
      return [
        result,
        ...remainingStages.map(makeSkippedStageResult)
      ]
    }

    const remainingResults = yield* runPipelineStages(remainingStages, policy)

    return [result, ...remainingResults]
  })

const makeSkippedStageResult = (stage: Stage): StageResult => ({
  name: stage.name,
  jobs: stage.jobs.map(makeSkippedJobResult)
})

const shouldStopPipeline = (stage: Stage, result: StageResult): boolean =>
  stage.jobs.some(
    (job, index) =>
      job.policy.critical &&
      isEscalatableJobResult(result.jobs[index] as JobResult)
  )

const summarizePipeline = (
  stages: ReadonlyArray<StageResult>
): PipelineStatus =>
  stages.some((stage) =>
    stage.jobs.some((job) => job.status === "Skipped" || job.status === "Interrupted")
  )
    ? "Failed"
    : stages.some((stage) => stage.jobs.some(isEscalatableJobResult))
      ? "SucceededWithWarnings"
      : "Succeeded"
