import { Schema } from "effect"
import type { StageResult } from "./stage"

export const PipelinePolicySchema = Schema.Struct({
  maxConcurrency: Schema.Int.pipe(Schema.positive())
})

export type PipelinePolicy = Schema.Schema.Type<typeof PipelinePolicySchema>

export type PipelineStatus =
  | "Succeeded"
  | "SucceededWithWarnings"
  | "Failed"

export interface PipelineReport {
  readonly status: PipelineStatus
  readonly stages: ReadonlyArray<StageResult>
}
