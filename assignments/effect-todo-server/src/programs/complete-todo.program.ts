import { Clock, Effect, Schema } from "effect"
import { TodoId } from "../domain/todo.schema"
import { TodoAlreadyCompletedError, TodoNotFoundError } from "../domain/todo.error"
import { TodoRepository } from "../services/todo-repository.service"
import { withAuditTransaction } from "./with-audit-transaction"

const decodeId = (raw: string) =>
  Schema.decode(TodoId)(raw).pipe(
    Effect.mapError(() => new TodoNotFoundError({ id: raw }))
  )

export const completeTodo = (rawId: string) =>
  Effect.gen(function* () {
    const id = yield* decodeId(rawId)
    const now = yield* Clock.currentTimeMillis
    const repo = yield* TodoRepository
    const todo = yield* repo.findById(id)
    if (todo.status === "Completed") {
      yield* Effect.fail(new TodoAlreadyCompletedError({ id: rawId }))
    }
    return yield* repo.markCompleted(id, now)
  }).pipe(
    withAuditTransaction("CompleteTodo", (todo) => ({
      target: todo.id,
      reason: "completed",
    }))
  )
