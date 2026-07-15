import { Clock, Effect } from "effect"
import { type AuditAction } from "../domain/audit-log.schema"
import { type TodoError } from "../domain/todo.error"
import { type TodoId } from "../domain/todo.schema"
import { AuditLog } from "../services/audit-log.service"
import { RequestContext } from "../services/request-context.service"
import { Transaction } from "../services/transaction.service"

/**
 * Pipe combinator: effect를 transaction으로 감싸고,
 * 성공 시 같은 transaction 안에서 audit log를 append한다.
 *
 *   Effect.gen(function* () { ... return todo })
 *     .pipe(withAuditTransaction("CreateTodo", (todo) => ({
 *       target: todo.id,
 *       reason: `created: ${todo.title}`,
 *     })))
 *
 * body는 순수 비즈니스 로직에 집중하고,
 * transaction boundary + audit append는 이 combinator가 책임진다.
 *
 * ── 동작 원리 ──
 *
 * Effect<A, E, R>는 Promise나 실행 중인 computation이 아니라
 * "무엇을 할지"를 기술하는 불변 값(description)이다.
 * 따라서 construction(조립)과 execution(실행)이 완전히 분리된다.
 *
 * 1. Construction phase (동기, 즉시)
 *    - Effect.gen(function* () { ... })는 body generator를 실행하지 않고
 *      Effect 값 A를 만든다. body 코드는 아직 한 줄도 실행되지 않았다.
 *    - .pipe(withAuditTransaction("CreateTodo", auditInfo))는 pipe가
 *      args[0](self)로 내부 함수 (self) => Effect<...>를 호출한다.
 *    - 이 함수는 self(body Effect)를 yield*로 실행하는 더 큰 Effect 값 B를
 *      반환한다. 이때 wrapper generator도 실행되지 않는다.
 *    - 결과: createTodo("hi")는 중첩된 Effect description 하나를 반환.
 *      generator는 하나도 실행되지 않았다.
 *
 * 2. Execution phase (runtime이 run할 때)
 *    Effect B가 실행되면:
 *      combinator 외부 generator 시작
 *        → Transaction service 획득
 *        → tx.withTransaction(Effect A) 호출 → DB BEGIN
 *          → Effect A 실행 (body generator가 여기서 처음 실행됨)
 *            → decodeTitle, IdGenerator, repo.create ...
 *            → return todo (body 성공해야 다음 줄로 진행)
 *          → RequestContext, Clock, auditInfo(todo), AuditLog.append
 *            (같은 transaction 안에서 INSERT)
 *        → COMMIT (성공) 또는 ROLLBACK (body/audit 실패 시)
 *
 * 핵심: self는 "실행 중인 generator reference"가 아니라 Effect 값이다.
 * combinator는 그것을 언제 어떻게 실행할지 자유롭게 결정할 수 있다 —
 * transaction 안에서, retry와 함께, timeout으로 감싸서, 등등.
 * 이게 Effect의 lazy evaluation + composability의 기반이다.
 */
export const withAuditTransaction = <A, E, R>(
  action: AuditAction,
  auditInfo: (result: A) => { readonly target: TodoId; readonly reason: string }
) =>
  (self: Effect.Effect<A, E, R>): Effect.Effect<A, E | TodoError, R | Transaction | AuditLog | RequestContext> =>
    Effect.gen(function* () {
      const tx = yield* Transaction
      return yield* tx.withTransaction(
        Effect.gen(function* () {
          const result = yield* self
          const ctx = yield* RequestContext
          const now = yield* Clock.currentTimeMillis
          const { target, reason } = auditInfo(result)
          const audit = yield* AuditLog
          yield* audit.append({
            requestId: ctx.requestId,
            action,
            target,
            reason,
            occurredAt: now,
            actorId: ctx.actorId,
          })
          return result
        })
      )
    })
