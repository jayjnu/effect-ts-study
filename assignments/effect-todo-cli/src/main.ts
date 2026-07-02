import { Command, ValidationError } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"
import { todoCommand } from "./cli"

const cli = Command.run(todoCommand, {
  name: "Effect Todo CLI",
  version: "v0.1.0"
})

const failExit = Effect.sync(() => {
  process.exitCode = 1
})

const renderUnexpectedError = (error: unknown): string => `Unexpected error: ${String(error)}`

cli(process.argv).pipe(
  Effect.catchAll((error) =>
    ValidationError.isValidationError(error)
      ? failExit
      : Console.error(renderUnexpectedError(error)).pipe(Effect.zipRight(failExit))
  ),
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain
)
