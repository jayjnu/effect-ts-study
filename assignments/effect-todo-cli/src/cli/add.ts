import { Args, Command } from "@effect/cli"
import { Console, Effect } from "effect"
import { addTodo } from "../programs/add-todo.program"

const title = Args.text({ name: "title" })

export const addCommand = Command.make("add", { title }, ({ title }) => {
  return addTodo({title})
    .pipe(
      Effect.flatMap((todo) => Console.log(`TODO add: ${todo.title}`)
    )
  )
});
