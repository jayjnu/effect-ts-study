import { Context, Effect } from "effect"
import { type Todo, type TodoId, type NewTodo } from "../domain/todo.schema"
import { type TodoError } from "../domain/todo.error"

type Create = (input: NewTodo) => Effect.Effect<Todo, TodoError>
type List = Effect.Effect<ReadonlyArray<Todo>, TodoError>
type FindById = (id: TodoId) => Effect.Effect<Todo, TodoError>
type MarkCompleted = (id: TodoId, completedAt: number) => Effect.Effect<Todo, TodoError>
type Remove = (id: TodoId) => Effect.Effect<void, TodoError>

export interface TodoRepositoryShape {
  readonly create: Create
  readonly list: List
  readonly findById: FindById
  readonly markCompleted: MarkCompleted
  readonly remove: Remove
}

export class TodoRepository extends Context.Tag("TodoRepository")<
  TodoRepository,
  TodoRepositoryShape
>() {}
