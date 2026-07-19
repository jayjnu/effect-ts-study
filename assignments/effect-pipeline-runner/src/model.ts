import { Schema } from "effect"
import type { Effect } from "effect"
import type { JobExecutionError } from "./errors"

export const JobPolicySchema = Schema.Struct({
  critical: Schema.Boolean,
  maxRetries: Schema.Int.pipe(Schema.nonNegative()),
  timeout: Schema.DurationFromSelf
})

export type JobPolicy = Schema.Schema.Type<typeof JobPolicySchema>

export const JobInputSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.nonEmptyString()),
  policy: JobPolicySchema
})

export type JobInput = Schema.Schema.Type<typeof JobInputSchema>

export interface Job extends JobInput {
  readonly run: Effect.Effect<void, JobExecutionError>
  readonly cleanup: Effect.Effect<void>
}

export const StageInputSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.nonEmptyString()),
  jobs: Schema.Array(JobInputSchema)
})

export type StageInput = Schema.Schema.Type<typeof StageInputSchema>

export interface Stage extends Omit<StageInput, "jobs"> {
  readonly jobs: ReadonlyArray<Job>
}

export const PipelinePolicySchema = Schema.Struct({
  maxConcurrency: Schema.Int.pipe(Schema.positive())
})

export type PipelinePolicy = Schema.Schema.Type<typeof PipelinePolicySchema>

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

export interface JobResult {
  readonly id: string
  readonly status: JobStatus
  readonly attempts: number
  readonly error?: JobExecutionError
}

export const makeSucceededJobResult = (
  job: Job,
  attempts: number
): JobResult => ({
  id: job.id,
  status: "Succeeded",
  attempts
})

export const makeFailedJobResult = (
  job: Job,
  attempts: number,
  error: JobExecutionError
): JobResult => ({
  id: job.id,
  status: "Failed",
  attempts,
  error
})

export const makeTimedOutJobResult = (
  job: Job,
  attempts: number,
  error: JobExecutionError
): JobResult => ({
  id: job.id,
  status: "TimedOut",
  attempts,
  error
})

export const makeInterruptedJobResult = (
  job: Job,
  attempts: number
): JobResult => ({
  id: job.id,
  status: "Interrupted",
  attempts
})

export const makeSkippedJobResult = (job: Job): JobResult => ({
  id: job.id,
  status: "Skipped",
  attempts: 0
})

export interface StageResult {
  readonly name: string
  readonly jobs: ReadonlyArray<JobResult>
}

export interface PipelineReport {
  readonly status: PipelineStatus
  readonly stages: ReadonlyArray<StageResult>
}
