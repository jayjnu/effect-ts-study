import { SqlClient } from "@effect/sql/SqlClient"
import { type SqlError } from "@effect/sql/SqlError"
import { Effect, Layer } from "effect"
import { type NewTodo, type Todo, type TodoId } from "../domain/todo.schema"
import { StorageError, TodoNotFoundError } from "../domain/todo.error"
import { TodoRepository } from "../services/todo-repository.service"

interface TodoRow {
  readonly id: string
  readonly title: string
  readonly status: string
  readonly created_at: number
  readonly completed_at: number | null
}

const toTodo = (row: TodoRow): Todo => ({
  id: row.id as TodoId,
  title: row.title,
  status: row.status as Todo["status"],
  createdAt: row.created_at,
  completedAt: row.completed_at,
})

const mapSqlError = <A, R>(eff: Effect.Effect<A, SqlError, R>) =>
  eff.pipe(
    Effect.catchTag("SqlError", (e) =>
      Effect.fail(
        new StorageError({ reason: (e as SqlError).message ?? "sql error" })
      )
    )
  )

export const SqliteTodoRepositoryLive = Layer.effect(
  TodoRepository,
  Effect.gen(function* () {
    const sql = yield* SqlClient
    return TodoRepository.of({
      create: (input: NewTodo) =>
        sql`INSERT INTO todos (id, title, status, created_at, completed_at)
            VALUES (${input.id}, ${input.title}, 'Pending', ${input.createdAt}, NULL)`
          .pipe(mapSqlError)
          .pipe(
            Effect.map(() => ({
              id: input.id,
              title: input.title,
              status: "Pending" as const,
              createdAt: input.createdAt,
              completedAt: null,
            }))
          ),

      list: sql<TodoRow>`SELECT id, title, status, created_at, completed_at FROM todos ORDER BY created_at`
        .pipe(mapSqlError)
        .pipe(Effect.map((rows) => rows.map(toTodo) as ReadonlyArray<Todo>)),

      findById: (id: TodoId) =>
        sql<TodoRow>`SELECT id, title, status, created_at, completed_at FROM todos WHERE id = ${id}`
          .pipe(mapSqlError)
          .pipe(
            Effect.flatMap((rows) =>
              rows.length === 0
                ? Effect.fail(new TodoNotFoundError({ id }))
                : Effect.succeed(toTodo(rows[0]!))
            )
          ),

      markCompleted: (id: TodoId, completedAt: number) =>
        sql<TodoRow>`UPDATE todos SET status = 'Completed', completed_at = ${completedAt} WHERE id = ${id} RETURNING id, title, status, created_at, completed_at`
          .pipe(mapSqlError)
          .pipe(
            Effect.flatMap((rows) =>
              rows.length === 0
                ? Effect.fail(new TodoNotFoundError({ id }))
                : Effect.succeed(toTodo(rows[0]!))
            )
          ),

      remove: (id: TodoId) =>
        sql<TodoRow>`DELETE FROM todos WHERE id = ${id}`.pipe(
          mapSqlError,
          Effect.asVoid
        ),
    })
  })
)
