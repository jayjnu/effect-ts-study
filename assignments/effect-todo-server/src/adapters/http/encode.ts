import { HttpServerResponse } from "@effect/platform"
import { type Todo } from "../../domain/todo.schema"
import { type TodoError } from "../../domain/todo.error"
import { type TodoDto } from "./dto"
import { ApiError, errorStatus, type ApiErrorResponse } from "./api-error"

/**
 * HTTP response encoder.
 * domain result/typed error를 HTTP response로 변환한다.
 * wire format schema(dto.ts, api-error.ts)은 contract 모듈에 있다.
 */

const withRequestId = (requestId: string) =>
  HttpServerResponse.setHeader("x-request-id", requestId)

// ── domain → DTO ──

const toTodoDto = (todo: Todo): TodoDto => ({
  id: todo.id,
  title: todo.title,
  status: todo.status,
  createdAt: todo.createdAt,
  completedAt: todo.completedAt,
})

// ── domain error → API error ──
// 이 매핑이 "도메인 에러에서 무엇이 보존되고 버려지는가"를 문서화한다.
// StorageError.reason(SQL 메시지)은 버리고 SERVER_ERROR로만 노출한다.

const toApiError = (err: TodoError): ApiError => {
  switch (err._tag) {
    case "TodoNotFoundError":
      return { code: "TODO_NOT_FOUND", id: err.id }
    case "InvalidTodoTitleError":
      return { code: "INVALID_TODO_TITLE", reason: err.reason }
    case "TodoAlreadyCompletedError":
      return { code: "TODO_ALREADY_COMPLETED", id: err.id }
    case "StorageError":
      return { code: "SERVER_ERROR" }
  }
}

// ── render helpers ──

export const renderTodo = (todo: Todo, requestId: string) =>
  HttpServerResponse.unsafeJson(toTodoDto(todo)).pipe(withRequestId(requestId))

export const renderTodos = (todos: ReadonlyArray<Todo>, requestId: string) =>
  HttpServerResponse.unsafeJson({ todos: todos.map(toTodoDto) }).pipe(
    withRequestId(requestId)
  )

export const renderNoContent = (_value: void, requestId: string) =>
  HttpServerResponse.empty({ status: 204 }).pipe(withRequestId(requestId))

export const renderError = (err: TodoError, requestId: string) => {
  const apiError = toApiError(err)
  const status = errorStatus[apiError.code]!
  const body: ApiErrorResponse = { error: apiError, requestId }
  return HttpServerResponse.unsafeJson(body, { status }).pipe(
    withRequestId(requestId)
  )
}

export const renderBadRequest = (message: string, requestId: string) => {
  const apiError: ApiError = { code: "BAD_REQUEST", message }
  const body: ApiErrorResponse = { error: apiError, requestId }
  return HttpServerResponse.unsafeJson(body, { status: 400 }).pipe(
    withRequestId(requestId)
  )
}
