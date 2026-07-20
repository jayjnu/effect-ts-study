import { Schema } from "effect"

/**
 * HTTP API contract — request/response DTO schema.
 *
 * wire format은 plain JSON이므로 domain의 branded type(TodoId)을 쓰지 않는다.
 * domain → DTO 매핑은 adapter가 담당한다.
 *
 * 이 모듈은 effect의 Schema만 의존하므로, 나중에 별도 패키지로 떼내기 쉽다.
 */

// ── Response DTOs ──

export const TodoDto = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  status: Schema.Literal("Pending", "Completed"),
  createdAt: Schema.Number,
  completedAt: Schema.NullOr(Schema.Number),
})
export type TodoDto = Schema.Schema.Type<typeof TodoDto>

export const ListTodosResponse = Schema.Struct({
  todos: Schema.Array(TodoDto),
})
export type ListTodosResponse = Schema.Schema.Type<typeof ListTodosResponse>

// ── Request DTOs ──

export const CreateTodoRequest = Schema.Struct({
  title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(200)),
})
export type CreateTodoRequest = Schema.Schema.Type<typeof CreateTodoRequest>

export const PathId = Schema.Struct({
  id: Schema.String,
})
export type PathId = Schema.Schema.Type<typeof PathId>
