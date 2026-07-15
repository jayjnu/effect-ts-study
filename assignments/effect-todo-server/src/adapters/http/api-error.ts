import { Schema } from "effect"

/**
 * HTTP API contract — error response schema + code↔status 매핑.
 *
 * domain error(TodoError)와 API error를 분리한다:
 * - domain error는 서버 내부 표현 (StorageError.reason = SQL 메시지 등)
 * - API error는 클라이언트와의 약속 (structured field만 노출, 내부 정보 버림)
 *
 * adapter가 domain error → API error로 명시적 매핑을 담당한다.
 * 이 모듈은 effect의 Schema만 의존하므로, 나중에 별도 패키지로 떼내기 쉽다.
 */

// ── API error variants ──
// domain error의 structured field(id, reason)를 보존하되,
// StorageError의 reason(SQL 메시지)은 버린다.

export const TodoNotFoundApiError = Schema.Struct({
  code: Schema.Literal("TODO_NOT_FOUND"),
  id: Schema.String,
})

export const InvalidTodoTitleApiError = Schema.Struct({
  code: Schema.Literal("INVALID_TODO_TITLE"),
  reason: Schema.String,
})

export const TodoAlreadyCompletedApiError = Schema.Struct({
  code: Schema.Literal("TODO_ALREADY_COMPLETED"),
  id: Schema.String,
})

export const ServerErrorApiError = Schema.Struct({
  code: Schema.Literal("SERVER_ERROR"),
})

export const BadRequestApiError = Schema.Struct({
  code: Schema.Literal("BAD_REQUEST"),
  message: Schema.String,
})

export const ApiError = Schema.Union(
  TodoNotFoundApiError,
  InvalidTodoTitleApiError,
  TodoAlreadyCompletedApiError,
  ServerErrorApiError,
  BadRequestApiError,
)
export type ApiError = Schema.Schema.Type<typeof ApiError>

// ── Error response envelope ──

export const ApiErrorResponse = Schema.Struct({
  error: ApiError,
  requestId: Schema.String,
})
export type ApiErrorResponse = Schema.Schema.Type<typeof ApiErrorResponse>

// ── code → HTTP status ──

export const errorStatus: Readonly<Record<ApiError["code"], number>> = {
  TODO_NOT_FOUND: 404,
  INVALID_TODO_TITLE: 400,
  TODO_ALREADY_COMPLETED: 409,
  SERVER_ERROR: 500,
  BAD_REQUEST: 400,
}
