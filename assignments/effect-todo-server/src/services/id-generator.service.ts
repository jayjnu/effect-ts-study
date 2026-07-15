import { Context, Effect } from "effect"
import { type TodoId } from "../domain/todo.schema"

export interface IdGeneratorShape {
  readonly nextTodoId: Effect.Effect<TodoId>
}

export class IdGenerator extends Context.Tag("IdGenerator")<
  IdGenerator,
  IdGeneratorShape
>() {}
