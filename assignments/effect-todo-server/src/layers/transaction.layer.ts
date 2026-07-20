import { SqlClient } from "@effect/sql/SqlClient"
import { type SqlError } from "@effect/sql/SqlError"
import { Effect, Layer } from "effect"
import { StorageError } from "../domain/todo.error"
import { Transaction } from "../services/transaction.service"

export const TransactionLive = Layer.effect(
  Transaction,
  Effect.gen(function* () {
    const sql = yield* SqlClient
    return Transaction.of({
      withTransaction: <R, E, A>(self: Effect.Effect<A, E, R>) =>
        sql.withTransaction(self).pipe(
          Effect.catchTag("SqlError", (e) =>
            Effect.fail(
              new StorageError({
                reason: (e as SqlError).message ?? "transaction failed",
              })
            )
          )
        ),
    })
  })
)
