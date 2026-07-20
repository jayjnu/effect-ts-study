import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"
import { type TodoError } from "../../domain/todo.error"
import { createTodo } from "../../programs/create-todo.program"
import { listTodo } from "../../programs/list-todo.program"
import { completeTodo } from "../../programs/complete-todo.program"
import { deleteTodo } from "../../programs/delete-todo.program"
import { RequestContext, type RequestContextShape } from "../../services/request-context.service"
import {
  renderBadRequest,
  renderError,
  renderNoContent,
  renderTodo,
  renderTodos,
} from "./encode"
import { CreateTodoRequest, PathId } from "./dto"

const extractContext = Effect.gen(function* () {
  const req = yield* HttpServerRequest.HttpServerRequest
  const requestId = req.headers["x-request-id"] ?? globalThis.crypto.randomUUID()
  const actorId = req.headers["x-actor-id"] ?? "anonymous"
  return RequestContext.of({ requestId, actorId })
})

const handle = <A, R>(
  ctx: RequestContextShape,
  program: Effect.Effect<A, TodoError, R>,
  render: (a: A, requestId: string) => HttpServerResponse.HttpServerResponse
) =>
  program.pipe(
    Effect.provideService(RequestContext, ctx),
    Effect.match({
      onFailure: (err: TodoError) => renderError(err, ctx.requestId),
      onSuccess: (a) => render(a, ctx.requestId),
    })
  )

export const todoRoutes = HttpRouter.empty.pipe(
  HttpRouter.post(
    "/todos",
    Effect.gen(function* () {
      const ctx = yield* extractContext
      return yield* HttpServerRequest.schemaBodyJson(CreateTodoRequest).pipe(
        Effect.matchEffect({
          onFailure: () =>
            Effect.succeed(
              renderBadRequest("request body must be { title: string }", ctx.requestId)
            ),
          onSuccess: (body) => handle(ctx, createTodo(body.title), renderTodo),
        })
      )
    })
  ),
  HttpRouter.get(
    "/todos",
    Effect.gen(function* () {
      const ctx = yield* extractContext
      return yield* handle(ctx, listTodo(), renderTodos)
    })
  ),
  HttpRouter.post(
    "/todos/:id/complete",
    Effect.gen(function* () {
      const ctx = yield* extractContext
      return yield* HttpRouter.schemaPathParams(PathId).pipe(
        Effect.matchEffect({
          onFailure: () =>
            Effect.succeed(renderBadRequest("path id is required", ctx.requestId)),
          onSuccess: ({ id }) => handle(ctx, completeTodo(id), renderTodo),
        })
      )
    })
  ),
  HttpRouter.del(
    "/todos/:id",
    Effect.gen(function* () {
      const ctx = yield* extractContext
      return yield* HttpRouter.schemaPathParams(PathId).pipe(
        Effect.matchEffect({
          onFailure: () =>
            Effect.succeed(renderBadRequest("path id is required", ctx.requestId)),
          onSuccess: ({ id }) => handle(ctx, deleteTodo(id), renderNoContent),
        })
      )
    })
  )
)
