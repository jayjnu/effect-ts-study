import { it, expect } from "@effect/vitest"
import { Clock, Effect, TestClock } from "effect"

it.effect("TestClock starts at 0", () =>
  Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis
    expect(now).toBe(0)
  })
)

it.effect("TestClock can be advanced", () =>
  Effect.gen(function* () {
    yield* TestClock.adjust("1000 millis")
    const now = yield* Clock.currentTimeMillis
    expect(now).toBe(1000)
  })
)
