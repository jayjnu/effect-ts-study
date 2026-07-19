import { Data } from "effect"

export class TransientCommandError extends Data.TaggedError(
  "TransientCommandError"
)<{
  readonly jobId: string
  readonly reason: string
}> {}

export class CommandFailed extends Data.TaggedError("CommandFailed")<{
  readonly jobId: string
  readonly reason: string
}> {}

export class JobTimedOut extends Data.TaggedError("JobTimedOut")<{
  readonly jobId: string
  readonly timeoutMillis: number
}> {}

export type JobExecutionError =
  | TransientCommandError
  | CommandFailed
  | JobTimedOut
