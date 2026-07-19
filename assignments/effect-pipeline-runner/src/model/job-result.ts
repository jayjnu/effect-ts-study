import type { JobExecutionError } from "./job-error"
import type { Job } from "./job"

export type JobStatus =
  | "Succeeded"
  | "Failed"
  | "TimedOut"
  | "Interrupted"
  | "Skipped"

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

export const isEscalatableJobResult = (result: JobResult): boolean =>
  result.status === "Failed" || result.status === "TimedOut"
