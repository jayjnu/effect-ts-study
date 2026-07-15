import { expect, it } from "@effect/vitest"
import { SqlClient } from "@effect/sql/SqlClient"
import { Effect, Either } from "effect"
import { StorageError } from "../src/domain/todo.error"
import { AuditLog } from "../src/services/audit-log.service"
import { RequestContext } from "../src/services/request-context.service"
import { createTodo } from "../src/programs/create-todo.program"
import { listTodo } from "../src/programs/list-todo.program"
import { completeTodo } from "../src/programs/complete-todo.program"
import { deleteTodo } from "../src/programs/delete-todo.program"
import { LiveLayer, SqliteClientLayer } from "../src/layers/live.layer"

const testContext = { requestId: "test-req", actorId: "tester" }

const provide = <A, E, R>(eff: Effect.Effect<A, E, R>) =>
  eff.pipe(
    Effect.provideService(RequestContext, testContext),
    Effect.provide(LiveLayer),
    Effect.provide(SqliteClientLayer(":memory:"))
  )

it.effect("createTodo writes todo and audit log in one transaction", () =>
  provide(
    Effect.gen(function* () {
      const todo = yield* createTodo("learn Effect")
      expect(todo.status).toBe("Pending")

      const todos = yield* listTodo()
      expect(todos).toHaveLength(1)
      expect(todos[0]!.title).toBe("learn Effect")

      const sql = yield* SqlClient
      const rows = yield* sql`SELECT action, target, request_id FROM audit_logs`
      expect(rows).toHaveLength(1)
      expect((rows[0] as { action: string }).action).toBe("CreateTodo")
      expect((rows[0] as { request_id: string }).request_id).toBe("test-req")
    })
  ).pipe(Effect.as(true))
)

it.effect("completeTodo marks completed and is idempotent-rejected", () =>
  provide(
    Effect.gen(function* () {
      const todo = yield* createTodo("to complete")
      const completed = yield* completeTodo(todo.id)
      expect(completed.status).toBe("Completed")
      expect(completed.completedAt).not.toBeNull()

      const again = yield* completeTodo(todo.id).pipe(Effect.either)
      expect(Either.isLeft(again)).toBe(true)
      if (Either.isLeft(again)) {
        expect(again.left._tag).toBe("TodoAlreadyCompletedError")
      }
    })
  ).pipe(Effect.as(true))
)

it.effect("completeTodo on missing todo yields TodoNotFoundError typed error", () =>
  provide(
    Effect.gen(function* () {
      const result = yield* completeTodo("todo_0_0").pipe(Effect.either)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left._tag).toBe("TodoNotFoundError")
      }
    })
  ).pipe(Effect.as(true))
)

it.effect("deleteTodo removes todo", () =>
  provide(
    Effect.gen(function* () {
      const todo = yield* createTodo("to delete")
      yield* deleteTodo(todo.id)
      const todos = yield* listTodo()
      expect(todos).toHaveLength(0)
    })
  ).pipe(Effect.as(true))
)

it.effect("audit log insert failure rolls back todo creation", () =>
  Effect.gen(function* () {
    const result = yield* createTodo("should rollback").pipe(Effect.either)
    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("StorageError")
    }

    const todos = yield* listTodo()
    expect(todos).toHaveLength(0)
  }).pipe(
    Effect.provideService(RequestContext, testContext),
    Effect.provideService(AuditLog, {
      append: () => Effect.fail(new StorageError({ reason: "forced audit failure" })),
    }),
    Effect.provide(LiveLayer),
    Effect.provide(SqliteClientLayer(":memory:"))
  ).pipe(Effect.as(true))
)
