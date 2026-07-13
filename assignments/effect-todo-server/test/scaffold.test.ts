import { expect, it } from "@effect/vitest"
import { Effect } from "effect"

it.effect("scaffold test runner is wired", () =>
  Effect.sync(() => {
    expect(true).toBe(true)
  })
)
