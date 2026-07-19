import { Effect } from "effect"
import { runStage } from "./stage-execution"
import { shouldStopPipeline } from "../policy/stage-failure-policy"
import {
  isEscalatableJobResult,
  makeSkippedJobResult
} from "../model/job-result"
import type {
  PipelinePolicy,
  PipelineReport,
  PipelineStatus,
  Stage,
  StageResult
} from "../model"

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

    if (shouldStopPipeline(stage.jobs, result.jobs)) {
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
