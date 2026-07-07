import * as Either from "effect/Either"

import {
  InvalidTodoStateTransitionError,
  TodoAlreadyCompletedError,
} from "./todo.error"
import { type CreateTodo, type Todo, type TodoId } from "./todo.schema"
import { DateTime } from "effect"

export function createTodo(input: CreateTodo, id: TodoId, now: DateTime.Utc): Todo {
  return {
    id,
    state: "todo",
    title: input.title,
    createdAt: now,
    updatedAt: now,
  }
}

export function markTodoDone(
  todo: Todo,
  now: DateTime.Utc
): Either.Either<Todo, TodoAlreadyCompletedError> {
  if (todo.state === "done") {
    return Either.left(new TodoAlreadyCompletedError({ id: todo.id }))
  }

  return Either.right({
    ...todo,
    state: "done",
    updatedAt: now,
  })
}

export function startTodo(
  todo: Todo,
  now: DateTime.Utc
): Either.Either<Todo, InvalidTodoStateTransitionError> {
  if (todo.state === "done") {
    return Either.left(
      new InvalidTodoStateTransitionError({
        from: "done",
        to: "in-progress",
      })
    )
  }

  return Either.right({
    ...todo,
    state: "in-progress",
    updatedAt: now,
  })
}

export function reopenTodo(
  todo: Todo,
  now: DateTime.Utc
): Either.Either<Todo, InvalidTodoStateTransitionError> {
  if (todo.state !== "done") {
    return Either.left(
      new InvalidTodoStateTransitionError({
        from: todo.state,
        to: "todo",
      })
    )
  }

  return Either.right({
    ...todo,
    state: "todo",
    updatedAt: now,
  })
}

export function renameTodo(
  todo: Todo,
  title: CreateTodo["title"],
  now: DateTime.Utc
): Todo {
  return {
    ...todo,
    title,
    updatedAt: now,
  }
}

export function isTodoDone(todo: Todo): boolean {
  return todo.state === "done"
}

export function isTodoInProgress(todo: Todo): boolean {
  return todo.state === "in-progress"
}
