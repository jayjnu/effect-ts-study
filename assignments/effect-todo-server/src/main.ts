import { HttpServer } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"
import { createServer } from "node:http"
import { ServerLayer } from "./server"

const port = Number(process.env.PORT ?? 3000)

const program = Layer.launch(
  HttpServer.withLogAddress(ServerLayer("todos.db")).pipe(
    Layer.provide(NodeHttpServer.layer(createServer, { port }))
  )
)

program.pipe(NodeRuntime.runMain)
