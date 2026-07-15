import { Context, Effect } from "effect"
import { type AuditAction } from "../domain/audit-log.schema"
import { type TodoError } from "../domain/todo.error"
import { type TodoId } from "../domain/todo.schema"

export interface AuditLogShape {
  readonly append: (record: {
    readonly requestId: string
    readonly action: AuditAction
    readonly target: TodoId
    readonly reason: string
    readonly occurredAt: number
    readonly actorId: string
  }) => Effect.Effect<void, TodoError>
}

export class AuditLog extends Context.Tag("AuditLog")<
  AuditLog,
  AuditLogShape
>() {}
