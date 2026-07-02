import { Command } from "@effect/cli"
import { Console } from "effect"

export const listCommand = Command.make("list", {}, () =>
  Console.log("TODO list")
)
