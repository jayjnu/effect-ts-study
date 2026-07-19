import { isEscalatableJobResult } from "../model/job-result"
import type { Job, JobResult } from "../model"

export const shouldAbortStage = (job: Job, result: JobResult): boolean =>
  job.policy.critical && isEscalatableJobResult(result)

export const shouldStopPipeline = (
  jobs: ReadonlyArray<Job>,
  results: ReadonlyArray<JobResult>
): boolean =>
  jobs.some((job, index) => {
    const result = results[index]

    return result !== undefined && shouldAbortStage(job, result)
  })
