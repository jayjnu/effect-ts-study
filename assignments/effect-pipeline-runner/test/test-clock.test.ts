import { expect, it } from "@effect/vitest"
import { Clock, Effect, TestClock } from "effect"

it.effect("provides deterministic TestClock", () =>
  Effect.gen(function* () {
    yield* TestClock.adjust("100 millis")
    expect(yield* Clock.currentTimeMillis).toBe(100)
  })
)
