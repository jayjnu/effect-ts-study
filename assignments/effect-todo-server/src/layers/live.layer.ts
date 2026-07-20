import { Layer } from "effect"
import { TodoRepository } from "../services/todo-repository.service"
import { AuditLog } from "../services/audit-log.service"
import { IdGenerator } from "../services/id-generator.service"
import { Transaction } from "../services/transaction.service"
import { SqliteTodoRepositoryLive } from "./sqlite-todo-repository.layer"
import { SqliteAuditLogLive } from "./sqlite-audit-log.layer"
import { IdGeneratorLive } from "./id-generator.layer"
import { TransactionLive } from "./transaction.layer"
import { SchemaLayer, SqliteClientLayer } from "./sqlite.layer"

export const LiveLayer = Layer.mergeAll(
  SqliteTodoRepositoryLive,
  SqliteAuditLogLive,
  TransactionLive,
  IdGeneratorLive,
  SchemaLayer
)

export {
  TodoRepository,
  AuditLog,
  IdGenerator,
  Transaction,
  SqliteClientLayer,
}
