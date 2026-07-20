import { Schema } from "effect"

export const TodoId = Schema.String.pipe(Schema.brand("TodoId"))
export type TodoId = string

export const TodoTitle = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(200)
)

export const TodoStatus = Schema.Literal("Pending", "Completed")
export const TodoStatusLiterals = TodoStatus.literals

export interface Todo {
  readonly id: TodoId
  readonly title: string
  readonly status: "Pending" | "Completed"
  readonly createdAt: number
  readonly completedAt: number | null
}

export const TodoSchema = Schema.Struct({
  id: TodoId,
  title: TodoTitle,
  status: TodoStatus,
  createdAt: Schema.Number,
  completedAt: Schema.NullOr(Schema.Number),
})

export interface NewTodo {
  readonly id: TodoId
  readonly title: string
  readonly createdAt: number
}
