import { describe, expect, it } from "vitest"
import * as Either from "effect/Either"

import {
  InvalidTodoStateTransitionError,
  TodoAlreadyCompletedError,
} from "../../src/domain/todo.error"
import {
  createTodo,
  isTodoDone,
  isTodoInProgress,
  markTodoDone,
  reopenTodo,
  renameTodo,
  startTodo,
} from "../../src/domain/todo.model"

describe("todo model", () => {
  it("creates a todo with generated fields filled in", () => {
    const now = new Date("2026-07-03T00:00:00.000Z")
    const todo = createTodo(
      { title: "Write model tests" },
      "123e4567-e89b-12d3-a456-426614174000",
      now
    )

    expect(todo).toEqual({
      id: "123e4567-e89b-12d3-a456-426614174000",
      state: "todo",
      title: "Write model tests",
      createdAt: now,
      updatedAt: now,
    })
  })

  it("marks a todo as done and refreshes updatedAt", () => {
    const createdAt = new Date("2026-07-03T00:00:00.000Z")
    const doneAt = new Date("2026-07-03T01:00:00.000Z")

    const result = markTodoDone(
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        state: "todo",
        title: "Write model tests",
        createdAt,
        updatedAt: createdAt,
      },
      doneAt
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right).toEqual({
        id: "123e4567-e89b-12d3-a456-426614174000",
        state: "done",
        title: "Write model tests",
        createdAt,
        updatedAt: doneAt,
      })
    }
  })

  it("rejects marking an already done todo as done again", () => {
    const createdAt = new Date("2026-07-03T00:00:00.000Z")
    const doneAt = new Date("2026-07-03T01:00:00.000Z")

    const result = markTodoDone(
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        state: "done",
        title: "Write model tests",
        createdAt,
        updatedAt: doneAt,
      },
      new Date("2026-07-03T02:00:00.000Z")
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(TodoAlreadyCompletedError)
      expect(result.left.id).toBe("123e4567-e89b-12d3-a456-426614174000")
    }
  })

  it("starts a todo and refreshes updatedAt", () => {
    const createdAt = new Date("2026-07-03T00:00:00.000Z")
    const startedAt = new Date("2026-07-03T00:30:00.000Z")

    const result = startTodo(
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        state: "todo",
        title: "Write model tests",
        createdAt,
        updatedAt: createdAt,
      },
      startedAt
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.state).toBe("in-progress")
      expect(result.right.updatedAt).toEqual(startedAt)
    }
  })

  it("rejects starting a done todo", () => {
    const createdAt = new Date("2026-07-03T00:00:00.000Z")
    const doneAt = new Date("2026-07-03T01:00:00.000Z")

    const result = startTodo(
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        state: "done",
        title: "Write model tests",
        createdAt,
        updatedAt: doneAt,
      },
      new Date("2026-07-03T02:00:00.000Z")
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidTodoStateTransitionError)
      expect(result.left.from).toBe("done")
      expect(result.left.to).toBe("in-progress")
    }
  })

  it("reopens a done todo back to todo", () => {
    const createdAt = new Date("2026-07-03T00:00:00.000Z")
    const doneAt = new Date("2026-07-03T01:00:00.000Z")
    const reopenedAt = new Date("2026-07-03T02:00:00.000Z")

    const result = reopenTodo(
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        state: "done",
        title: "Write model tests",
        createdAt,
        updatedAt: doneAt,
      },
      reopenedAt
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.state).toBe("todo")
      expect(result.right.updatedAt).toEqual(reopenedAt)
    }
  })

  it("rejects reopening a todo that is not done", () => {
    const createdAt = new Date("2026-07-03T00:00:00.000Z")

    const result = reopenTodo(
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        state: "todo",
        title: "Write model tests",
        createdAt,
        updatedAt: createdAt,
      },
      new Date("2026-07-03T02:00:00.000Z")
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidTodoStateTransitionError)
      expect(result.left.from).toBe("todo")
      expect(result.left.to).toBe("todo")
    }
  })

  it("renames a todo and refreshes updatedAt", () => {
    const createdAt = new Date("2026-07-03T00:00:00.000Z")
    const renamedAt = new Date("2026-07-03T03:00:00.000Z")

    const result = renameTodo(
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        state: "in-progress",
        title: "Write model tests",
        createdAt,
        updatedAt: createdAt,
      },
      "Write better model tests",
      renamedAt
    )

    expect(result).toEqual({
      id: "123e4567-e89b-12d3-a456-426614174000",
      state: "in-progress",
      title: "Write better model tests",
      createdAt,
      updatedAt: renamedAt,
    })
  })

  it("answers done and in-progress state helpers", () => {
    expect(
      isTodoDone({
        id: "123e4567-e89b-12d3-a456-426614174000",
        state: "done",
        title: "Write model tests",
        createdAt: new Date("2026-07-03T00:00:00.000Z"),
        updatedAt: new Date("2026-07-03T01:00:00.000Z"),
      })
    ).toBe(true)

    expect(
      isTodoInProgress({
        id: "123e4567-e89b-12d3-a456-426614174000",
        state: "in-progress",
        title: "Write model tests",
        createdAt: new Date("2026-07-03T00:00:00.000Z"),
        updatedAt: new Date("2026-07-03T00:30:00.000Z"),
      })
    ).toBe(true)
  })
})
