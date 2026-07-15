import { Context, Effect } from "effect"
import { type StorageError } from "../domain/todo.error"

/**
 * Transaction boundary service.
 *
 * 왜 SqlClient를 program에 직접 주지 않고 별도 service로 추상화하는가?
 *
 * 1. capability 제한 (핵심)
 *    SqlClient는 fat interface다 — raw SQL template literal, unsafe, insert/update
 *    helper, reserve, reactive 등을 모두 노출한다. program이 SqlClient에 직접
 *    의존하면 lint가 막지 않는 한 program 안에서 raw SQL을 쓸 수 있고, 그건
 *    spec이 금지하는 일이다.
 *    Transaction service는 오직 withTransaction 하나만 노출하여 program이
 *    할 수 있는 일을 의도적으로 좁힌다. 이건 DB 추상화가 아니라 capability
 *    restriction이다. (dialect 교체는 SqlClient 자체가 이미 흡수한다.)
 *
 * 2. spec의 prose 요구사항
 *    "programs가 SQL query나 DB client를 직접 import하면 안 된다."
 *    ESLint layer-dependency rule은 ../layers 상대경로만 검사하고
 *    @effect/sql/SqlClient npm 패키지 import는 잡지 않으므로, 이 요구사항을
 *    service interface 분리로 지킨다.
 *
 * 3. 에러 번역 단일화
 *    SqlClient.withTransaction은 error channel에 SqlError를 추가한다.
 *    이걸 program마다 catchTag로 domain StorageError로 번역하면 중복이므로,
 *    TransactionLive 구현체가 한 곳에서 처리한다.
 *
 * 한계: 이 추상화는 "같은 persistence boundary 안에서의 ACID atomic 연산"이라는
 * 전제 하에만 유효하다. outbox(별도 service), saga, 분산 transaction처럼
 * boundary를 넘는 orchestration에서는 ACID 보장이 깨지므로 이 추상화로
 * program을 속이게 된다. 그런 경우는 Saga / OutboxPublisher 같은 별도 추상화가
 * program에 노출되어야 한다.
 */
export interface TransactionShape {
  readonly withTransaction: <R, E, A>(
    self: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | StorageError, R>
}

export class Transaction extends Context.Tag("Transaction")<
  Transaction,
  TransactionShape
>() {}
