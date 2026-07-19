import { Duration, Either, Schema } from "effect"
import { describe, expect, it } from "vitest"
import { JobInputSchema, PipelinePolicySchema } from "../src/model"

describe("pipeline model schemas", () => {
  it("decodes job input data without Effect fields", () => {
    const decoded = Schema.decodeUnknownEither(JobInputSchema)({
      id: "install",
      policy: {
        critical: true,
        maxRetries: 2,
        timeout: Duration.millis(500)
      }
    })

    expect(Either.isRight(decoded)).toBe(true)
  })

  it("rejects invalid pipeline policy data", () => {
    const decoded = Schema.decodeUnknownEither(PipelinePolicySchema)({
      maxConcurrency: 0
    })

    expect(Either.isLeft(decoded)).toBe(true)
  })
})
