import { HttpServer } from "@effect/platform"
import { Layer } from "effect"
import { todoRoutes } from "../adapters/http/todo-routes"
import { LiveLayer, SqliteClientLayer } from "../layers/live.layer"

export const ServerLayer = (filename: string) =>
  HttpServer.serve(todoRoutes).pipe(
    Layer.provide(LiveLayer),
    Layer.provide(SqliteClientLayer(filename))
  )
