import { Args, Command } from "@effect/cli"
import { Console } from "effect"

const id = Args.text({ name: "id" })

export const doneCommand = Command.make("done", { id }, ({ id }) =>
  Console.log(`TODO done: ${id}`)
)
