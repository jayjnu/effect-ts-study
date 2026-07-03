import { describe, expect, it } from "vitest"
import * as Either from "effect/Either"
import * as Schema from "effect/Schema"

import { TodoSchema } from "../../src/domain/todo.schema"

describe("TodoSchema", () => {
  const decodeTodo = Schema.decodeUnknownEither(TodoSchema)

  it("accepts a valid todo", () => {
    const createdAt = "2026-07-03T00:00:00.000Z"
    const updatedAt = "2026-07-03T01:00:00.000Z"

    const result = decodeTodo({
      state: "todo",
      title: "Write tests",
      createdAt,
      updatedAt
    })

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right).toEqual({
        state: "todo",
        title: "Write tests",
        createdAt: new Date(createdAt),
        updatedAt: new Date(updatedAt)
      })
    }
  })

  it("rejects titles shorter than 4 characters", () => {
    const result = decodeTodo({
      state: "todo",
      title: "abc",
      createdAt: "2026-07-03T00:00:00.000Z",
      updatedAt: "2026-07-03T01:00:00.000Z"
    })

    expect(Either.isLeft(result)).toBe(true)
  })

  it("rejects unknown todo states", () => {
    const result = decodeTodo({
      state: "blocked",
      title: "Write tests",
      createdAt: "2026-07-03T00:00:00.000Z",
      updatedAt: "2026-07-03T01:00:00.000Z"
    })

    expect(Either.isLeft(result)).toBe(true)
  })

  it("rejects todos whose updatedAt is not later than createdAt", () => {
    const result = decodeTodo({
      state: "todo",
      title: "Write tests",
      createdAt: "2026-07-03T01:00:00.000Z",
      updatedAt: "2026-07-03T01:00:00.000Z"
    })

    expect(Either.isLeft(result)).toBe(true)
  })
})
