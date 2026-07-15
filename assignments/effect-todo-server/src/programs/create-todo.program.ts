import { Clock, Effect, Schema } from "effect"
import { TodoTitle } from "../domain/todo.schema"
import { InvalidTodoTitleError } from "../domain/todo.error"
import { TodoRepository } from "../services/todo-repository.service"
import { IdGenerator } from "../services/id-generator.service"
import { withAuditTransaction } from "./with-audit-transaction"

const decodeTitle = (raw: string) =>
  Schema.decode(TodoTitle)(raw).pipe(
    Effect.mapError(
      () => new InvalidTodoTitleError({ reason: "title must be 1..200 characters" })
    )
  )

export const createTodo = (rawTitle: string) =>
  Effect.gen(function* () {
    const title = yield* decodeTitle(rawTitle)
    const idGen = yield* IdGenerator
    const now = yield* Clock.currentTimeMillis
    const id = yield* idGen.nextTodoId
    const repo = yield* TodoRepository
    return yield* repo.create({ id, title, createdAt: now })
  }).pipe(
    withAuditTransaction("CreateTodo", (todo) => ({
      target: todo.id,
      reason: `created: ${todo.title}`,
    }))
  )
