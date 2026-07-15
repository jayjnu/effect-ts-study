import { Schema } from "effect"
import { TodoId } from "./todo.schema"

export const AuditAction = Schema.Literal("CreateTodo", "CompleteTodo", "DeleteTodo")
export type AuditAction = Schema.Schema.Type<typeof AuditAction>

export const AuditResult = Schema.Literal("Succeeded")
export type AuditResult = Schema.Schema.Type<typeof AuditResult>

export interface AuditRecord {
  readonly requestId: string
  readonly action: AuditAction
  readonly target: TodoId
  readonly result: AuditResult
  readonly reason: string
  readonly occurredAt: number
  readonly actorId: string
}
