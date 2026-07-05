import { NodeContext } from "@effect/platform-node"
import { FileSystem } from "@effect/platform/FileSystem"
import { expect, it } from "@effect/vitest"
import { Effect, Option } from "effect"

import type { Todo } from "../../src/domain/todo.schema"
import { FileSystemTodoRepository, FileSystemTodoRepositoryConfig } from "../../src/layers/fs-todo-repository.layer"
import { TodoRepository } from "../../src/services/todo-repository.service"

const makePersistedTable = (...todos: ReadonlyArray<Todo>) => ({
  entities: Object.fromEntries(todos.map((todo) => [todo.id, todo])),
  ids: todos.map((todo) => todo.id),
})

const firstTodo = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  state: "todo" as const,
  title: "Write fs repo test",
  createdAt: new Date("2026-07-05T00:00:00.000Z"),
  updatedAt: new Date("2026-07-05T00:00:00.000Z"),
}

const secondTodo = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  state: "done" as const,
  title: "Ship fs repo test",
  createdAt: new Date("2026-07-05T01:00:00.000Z"),
  updatedAt: new Date("2026-07-05T02:00:00.000Z"),
}

it.scoped("lists todos persisted in the backing file", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem
    const dir = yield* fs.makeTempDirectoryScoped()
    const dataPath = `${dir}/todos.json`

    yield* fs.writeFileString(
      dataPath,
      JSON.stringify(makePersistedTable(firstTodo, secondTodo))
    )

    const todos = yield* Effect.gen(function* () {
      const repo = yield* TodoRepository
      return yield* repo.list
    }).pipe(
      Effect.provide(FileSystemTodoRepository),
      Effect.provideService(FileSystemTodoRepositoryConfig, { dataPath })
    )

    expect(todos).toEqual([firstTodo, secondTodo])
  }).pipe(Effect.provide(NodeContext.layer))
)

it.scoped("creates the backing file when the repository is initialized for the first time", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem
    const dir = yield* fs.makeTempDirectoryScoped()
    const dataPath = `${dir}/todos.json`

    const todos = yield* Effect.gen(function* () {
      const repo = yield* TodoRepository
      return yield* repo.list
    }).pipe(
      Effect.provide(FileSystemTodoRepository),
      Effect.provideService(FileSystemTodoRepositoryConfig, { dataPath })
    )

    expect(todos).toEqual([])

    const rawTable = yield* fs.readFileString(dataPath)
    expect(JSON.parse(rawTable)).toEqual(
      JSON.parse(JSON.stringify(makePersistedTable()))
    )
  }).pipe(Effect.provide(NodeContext.layer))
)

it.scoped("upsertMany updates an existing todo and appends a new todo", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem
    const dir = yield* fs.makeTempDirectoryScoped()
    const dataPath = `${dir}/todos.json`

    yield* fs.writeFileString(
      dataPath,
      JSON.stringify(makePersistedTable(firstTodo))
    )

    const updatedFirstTodo = {
      ...firstTodo,
      state: "done" as const,
      updatedAt: new Date("2026-07-05T03:00:00.000Z"),
    }

    const thirdTodo = {
      id: "123e4567-e89b-12d3-a456-426614174002",
      state: "todo" as const,
      title: "Review todos",
      createdAt: new Date("2026-07-05T04:00:00.000Z"),
      updatedAt: new Date("2026-07-05T04:00:00.000Z"),
    }

    const persistedTodos = yield* Effect.gen(function* () {
      const repo = yield* TodoRepository
      yield* repo.upsertMany(updatedFirstTodo, thirdTodo)
      return yield* repo.list
    }).pipe(
      Effect.provide(FileSystemTodoRepository),
      Effect.provideService(FileSystemTodoRepositoryConfig, { dataPath })
    )

    expect(persistedTodos).toEqual([updatedFirstTodo, thirdTodo])

    const rawTable = yield* fs.readFileString(dataPath)
    expect(JSON.parse(rawTable)).toEqual(
      JSON.parse(
        JSON.stringify(makePersistedTable(updatedFirstTodo, thirdTodo))
      )
    )
  }).pipe(Effect.provide(NodeContext.layer))
)

it.scoped("findById returns some when the todo exists", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem
    const dir = yield* fs.makeTempDirectoryScoped()
    const dataPath = `${dir}/todos.json`

    yield* fs.writeFileString(
      dataPath,
      JSON.stringify(makePersistedTable(firstTodo, secondTodo))
    )

    const maybeTodo = yield* Effect.gen(function* () {
      const repo = yield* TodoRepository
      return yield* repo.findById(firstTodo.id)
    }).pipe(
      Effect.provide(FileSystemTodoRepository),
      Effect.provideService(FileSystemTodoRepositoryConfig, { dataPath })
    )

    expect(Option.getOrUndefined(maybeTodo)).toEqual(firstTodo)
  }).pipe(Effect.provide(NodeContext.layer))
)

it.scoped("findById returns none when the todo does not exist", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem
    const dir = yield* fs.makeTempDirectoryScoped()
    const dataPath = `${dir}/todos.json`

    yield* fs.writeFileString(
      dataPath,
      JSON.stringify(makePersistedTable(firstTodo))
    )

    const maybeTodo = yield* Effect.gen(function* () {
      const repo = yield* TodoRepository
      return yield* repo.findById("123e4567-e89b-12d3-a456-426614174099")
    }).pipe(
      Effect.provide(FileSystemTodoRepository),
      Effect.provideService(FileSystemTodoRepositoryConfig, { dataPath })
    )

    expect(Option.isNone(maybeTodo)).toBe(true)
  }).pipe(Effect.provide(NodeContext.layer))
)
