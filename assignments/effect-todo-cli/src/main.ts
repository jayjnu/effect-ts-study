import { Command, ValidationError } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect, Layer } from "effect"
import { todoCommand } from "./cli"
import { IdGenerator } from "./services/id-generator.service"
import { FileSystemTodoRepository, FileSystemTodoRepositoryConfig } from "./layers/fs-todo-repository.layer"
import { cwd } from "node:process"
import { join } from "node:path"

const IdGeneratorLive = Layer.succeed(IdGenerator, IdGenerator.of({
  nextId: Effect.sync(() => crypto.randomUUID())
}));
const TodoRepositoryConfigLive = Layer.succeed(FileSystemTodoRepositoryConfig, {
  dataPath: join(cwd(), 'data.json')
});
const TodoRepositoryLive = FileSystemTodoRepository.pipe(
  Layer.provide(TodoRepositoryConfigLive),
  Layer.provide(NodeContext.layer)
)
const AppLayer = Layer.mergeAll(
  NodeContext.layer,
  IdGeneratorLive,
  TodoRepositoryLive,
)

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
  Effect.provide(AppLayer),
  NodeRuntime.runMain
)
