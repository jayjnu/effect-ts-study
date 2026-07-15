import { Effect, Schema } from "effect"
import { TodoId } from "../domain/todo.schema"
import { TodoNotFoundError } from "../domain/todo.error"
import { TodoRepository } from "../services/todo-repository.service"
import { withAuditTransaction } from "./with-audit-transaction"

const decodeId = (raw: string) =>
  Schema.decode(TodoId)(raw).pipe(
    Effect.mapError(() => new TodoNotFoundError({ id: raw }))
  )

export const deleteTodo = (rawId: string) =>
  Effect.gen(function* () {
    const id = yield* decodeId(rawId)
    const repo = yield* TodoRepository
    const todo = yield* repo.findById(id)
    yield* repo.remove(todo.id)
    return todo.id
  }).pipe(
    withAuditTransaction("DeleteTodo", (id) => ({
      target: id,
      reason: "deleted",
    })),
    Effect.asVoid
  )
