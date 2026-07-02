import { Command } from "@effect/cli"
import { Console } from "effect"
import { addCommand } from "./add"
import { doneCommand } from "./done"
import { importCommand } from "./import"
import { listCommand } from "./list"

export const todoCommand = Command.make("todo", {}, () =>
  Console.log("TODO: implement Effect Todo CLI")
).pipe(Command.withSubcommands([addCommand, listCommand, doneCommand, importCommand]))
