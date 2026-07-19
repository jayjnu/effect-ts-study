import { Schema } from "effect"
import { JobInputSchema } from "./job"
import type { Job } from "./job"
import type { JobResult } from "./job-result"

export const StageInputSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.nonEmptyString()),
  jobs: Schema.Array(JobInputSchema)
})

export type StageInput = Schema.Schema.Type<typeof StageInputSchema>

export interface Stage extends Omit<StageInput, "jobs"> {
  readonly jobs: ReadonlyArray<Job>
}

export interface StageResult {
  readonly name: string
  readonly jobs: ReadonlyArray<JobResult>
}
