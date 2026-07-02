import { Args, Command } from "@effect/cli"
import { Console } from "effect"

const file = Args.text({ name: "file" })

export const importCommand = Command.make("import", { file }, ({ file }) =>
  Console.log(`TODO import: ${file}`)
)
