import { Command } from "@effect/cli"
import { Console, Effect } from "effect"
import { listTodo } from "../programs/list-todo.program"

export const listCommand = Command.make("list", {}, () => {
  return listTodo().pipe(Effect.flatMap((items) => {
    return Console.table(items, ['id', 'title', 'state', 'updatedAt', 'createdAt'])
  }))
})
