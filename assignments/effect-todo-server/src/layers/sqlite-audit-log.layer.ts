import { SqlClient } from "@effect/sql/SqlClient"
import { type SqlError } from "@effect/sql/SqlError"
import { Effect, Layer } from "effect"
import { StorageError } from "../domain/todo.error"
import { AuditLog } from "../services/audit-log.service"

const mapSqlError = <A, R>(eff: Effect.Effect<A, SqlError, R>) =>
  eff.pipe(
    Effect.catchTag("SqlError", (e) =>
      Effect.fail(
        new StorageError({ reason: (e as SqlError).message ?? "sql error" })
      )
    )
  )

export const SqliteAuditLogLive = Layer.effect(
  AuditLog,
  Effect.gen(function* () {
    const sql = yield* SqlClient
    return AuditLog.of({
      append: (record) =>
        sql`INSERT INTO audit_logs (request_id, action, target, result, reason, occurred_at, actor_id)
            VALUES (${record.requestId}, ${record.action}, ${record.target}, 'Succeeded', ${record.reason}, ${record.occurredAt}, ${record.actorId})`
          .pipe(mapSqlError, Effect.asVoid),
    })
  })
)
