import { Match, Predicate } from "effect"
import type { JobExecutionError } from "../errors"

export const JobErrorPolicy = {
  isRetryable: Predicate.isTagged("TransientCommandError"),
  toFailureStatus: Match.type<JobExecutionError>().pipe(
    Match.tagsExhaustive({
      TransientCommandError: () => "Failed" as const,
      CommandFailed: () => "Failed" as const,
      JobTimedOut: () => "TimedOut" as const
    })
  )
}
