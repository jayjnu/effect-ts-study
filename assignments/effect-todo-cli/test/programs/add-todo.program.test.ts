import { expect, it } from "@effect/vitest"
import { DateTime, Effect, TestClock } from "effect"

import { addTodo } from "../../src/programs/add-todo.program"
import { IdGenerator } from "../../src/services/id-generator.service"
import { TodoRepository } from "../../src/services/todo-repository.service"
import type { Todo } from "../../src/domain/todo.schema"

it.effect("creates a todo from input and persists it", () =>
  Effect.gen(function* () {
    const createdAt = Date.parse("2026-07-05T00:00:00.000Z")
    const generatedId = "123e4567-e89b-12d3-a456-426614174000"
    let persistedTodos: ReadonlyArray<Todo> = []

    yield* TestClock.adjust(`${createdAt} millis`)

    const todo = yield* addTodo({ title: "Write program tests" }).pipe(
      Effect.provideService(TodoRepository, {
        findById: () => Effect.die("findById should not be called"),
        list: Effect.die("list should not be called"),
        upsertMany: (...todos) =>
          Effect.sync(() => {
            persistedTodos = todos
          }),
      }),
      Effect.provideService(IdGenerator, {
        nextId: Effect.succeed(generatedId),
      })
    )

    expect(todo).toEqual({
      id: generatedId,
      state: "todo",
      title: "Write program tests",
      createdAt: DateTime.unsafeMake(createdAt),
      updatedAt: DateTime.unsafeMake(createdAt),
    })
    expect(persistedTodos).toEqual([todo])
  })
)
