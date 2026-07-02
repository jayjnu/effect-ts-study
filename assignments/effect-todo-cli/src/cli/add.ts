import { Args, Command } from "@effect/cli"
import { Console } from "effect"

const title = Args.text({ name: "title" })

export const addCommand = Command.make("add", { title }, ({ title }) =>
  Console.log(`TODO add: ${title}`)
)
