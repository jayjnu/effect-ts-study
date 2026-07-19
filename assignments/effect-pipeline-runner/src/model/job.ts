import { Schema } from "effect"
import type { Effect } from "effect"
import type { JobExecutionError } from "./job-error"

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
