import {
  Cause,
  Duration,
  Effect,
  Exit,
  Option,
  Ref,
  Schedule
} from "effect"
import { JobTimedOut } from "../model/job-error"
import { JobErrorPolicy } from "../policy/job-error-policy"
import {
  makeFailedJobResult,
  makeInterruptedJobResult,
  makeSucceededJobResult,
  makeTimedOutJobResult
} from "../model/job-result"
import type { Job, JobResult } from "../model"
import type { JobExecutionError } from "../model/job-error"

export const runJob = (job: Job): Effect.Effect<JobResult> =>
  Effect.gen(function* () {
    const attempts = yield* Ref.make(0)
    const runAttempt = Ref.update(attempts, (count) => count + 1).pipe(
      Effect.zipRight(job.run)
    )
    const retryPolicy = Schedule.recurs(job.policy.maxRetries).pipe(
      Schedule.whileInput(JobErrorPolicy.isRetryable)
    )
    const executable = runAttempt.pipe(
      Effect.retry(retryPolicy),
      Effect.timeoutFail({
        duration: job.policy.timeout,
        onTimeout: () =>
          new JobTimedOut({
            jobId: job.id,
            timeoutMillis: Duration.toMillis(job.policy.timeout)
          })
      }),
      Effect.ensuring(job.cleanup)
    )
    const exit = yield* Effect.exit(executable)
    const finalAttempts = yield* Ref.get(attempts)

    return JobExitMapper.toResult(job, finalAttempts, exit)
  })

const JobExitMapper = {
  toResult: (
    job: Job,
    attempts: number,
    exit: Exit.Exit<void, JobExecutionError>
  ): JobResult =>
    Exit.match(exit, {
      onFailure: (cause) =>
        Option.match(Cause.failureOption(cause), {
          onNone: () => makeInterruptedJobResult(job, attempts),
          onSome: (error) =>
            JobErrorPolicy.toFailureStatus(error) === "TimedOut"
              ? makeTimedOutJobResult(job, attempts, error)
              : makeFailedJobResult(job, attempts, error)
        }),
      onSuccess: () => makeSucceededJobResult(job, attempts)
    })
}
