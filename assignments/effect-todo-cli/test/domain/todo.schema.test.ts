import { describe, expect, it } from "vitest"
import * as Either from "effect/Either"
import * as Schema from "effect/Schema"

import { TodoSchema } from "../../src/domain/todo.schema"
import { DateTime } from "effect"

describe("TodoSchema", () => {
  const decodeTodo = Schema.decodeUnknownEither(TodoSchema)

  it("accepts a valid todo", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000"
    const createdAt = "2026-07-03T00:00:00.000Z"
    const updatedAt = "2026-07-03T01:00:00.000Z"

    const result = decodeTodo({
      id,
      state: "todo",
      title: "Write tests",
      createdAt,
      updatedAt
    })

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right).toEqual({
        id,
        state: "todo",
        title: "Write tests",
        createdAt: DateTime.unsafeMake(createdAt),
        updatedAt: DateTime.unsafeMake(updatedAt),
      })
    }
  })

  it("rejects titles shorter than 4 characters", () => {
    const result = decodeTodo({
      id: "123e4567-e89b-12d3-a456-426614174000",
      state: "todo",
      title: "abc",
      createdAt: "2026-07-03T00:00:00.000Z",
      updatedAt: "2026-07-03T01:00:00.000Z"
    })

    expect(Either.isLeft(result)).toBe(true)
  })

  it("rejects unknown todo states", () => {
    const result = decodeTodo({
      id: "123e4567-e89b-12d3-a456-426614174000",
      state: "blocked",
      title: "Write tests",
      createdAt: "2026-07-03T00:00:00.000Z",
      updatedAt: "2026-07-03T01:00:00.000Z"
    })

    expect(Either.isLeft(result)).toBe(true)
  })

  it("accepts todos whose updatedAt is equal to createdAt", () => {
    const result = decodeTodo({
      id: "123e4567-e89b-12d3-a456-426614174000",
      state: "todo",
      title: "Write tests",
      createdAt: "2026-07-03T01:00:00.000Z",
      updatedAt: "2026-07-03T01:00:00.000Z"
    })

    expect(Either.isRight(result)).toBe(true)
  })

  it("rejects todos whose updatedAt is earlier than createdAt", () => {
    const result = decodeTodo({
      id: "123e4567-e89b-12d3-a456-426614174000",
      state: "todo",
      title: "Write tests",
      createdAt: "2026-07-03T01:00:00.000Z",
      updatedAt: "2026-07-03T00:00:00.000Z"
    })

    expect(Either.isLeft(result)).toBe(true)
  })

  it("rejects malformed todo ids", () => {
    const result = decodeTodo({
      id: "not-a-uuid",
      state: "todo",
      title: "Write tests",
      createdAt: "2026-07-03T00:00:00.000Z",
      updatedAt: "2026-07-03T01:00:00.000Z"
    })

    expect(Either.isLeft(result)).toBe(true)
  })
})
