import { Data } from "effect"
import { type TodoStatusLiterals } from "./todo.schema"

export class InvalidTodoTitleError extends Data.TaggedError("InvalidTodoTitleError")<{
  readonly reason: string
}> {}

export class TodoNotFoundError extends Data.TaggedError("TodoNotFoundError")<{
  readonly id: string
}> {}

export class TodoAlreadyCompletedError extends Data.TaggedError("TodoAlreadyCompletedError")<{
  readonly id: string
}> {}

export class StorageError extends Data.TaggedError("StorageError")<{
  readonly reason: string
}> {}

export type TodoError =
  | InvalidTodoTitleError
  | TodoNotFoundError
  | TodoAlreadyCompletedError
  | StorageError

export type TodoState = typeof TodoStatusLiterals[number]
