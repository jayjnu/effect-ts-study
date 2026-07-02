import { it, expect } from "@effect/vitest"
import { Effect, Ref } from "effect"

it.scoped("it.scoped keeps resources acquired inside the test body", () =>
  Effect.gen(function* () {
    const released = yield* Ref.make(false)
    yield* Effect.acquireRelease(
      Ref.set(released, false),
      () => Ref.set(released, true)
    )
    const isAcquired = yield* Ref.get(released)
    expect(isAcquired).toBe(false)
  })
)

it.effect("Effect.scoped runs cleanup on failure", () =>
  Effect.gen(function* () {
    const released = yield* Ref.make(false)
    const result = yield* Effect.exit(
      Effect.acquireRelease(
        Effect.void,
        () => Ref.set(released, true)
      ).pipe(
        Effect.zipRight(Effect.fail("boom")),
        Effect.scoped
      )
    )
    expect(result._tag).toBe("Failure")
    const isReleased = yield* Ref.get(released)
    expect(isReleased).toBe(true)
  })
)
