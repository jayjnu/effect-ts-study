import { Context, Effect } from "effect"
import type { TodoId } from "../domain/todo.schema"

export interface IdGeneratorShape {
  readonly nextId: Effect.Effect<TodoId>
}

export class IdGenerator extends Context.Tag("IdGenerator")<
  IdGenerator,
  IdGeneratorShape
>() {}
