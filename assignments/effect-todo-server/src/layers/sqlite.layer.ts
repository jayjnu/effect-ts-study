import { SqliteClient } from "@effect/sql-sqlite-node"
import { SqlClient } from "@effect/sql/SqlClient"
import { Effect, Layer } from "effect"

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    completed_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    result TEXT NOT NULL,
    reason TEXT NOT NULL,
    occurred_at INTEGER NOT NULL,
    actor_id TEXT NOT NULL
  )`,
] as const

export const initSchema = Effect.gen(function* () {
  const sql = yield* SqlClient
  for (const stmt of SCHEMA) {
    yield* sql.unsafe(stmt)
  }
})

export const SqliteClientLayer = (filename: string) =>
  SqliteClient.layer({ filename, disableWAL: true })

export const SchemaLayer = Layer.effectDiscard(initSchema)
