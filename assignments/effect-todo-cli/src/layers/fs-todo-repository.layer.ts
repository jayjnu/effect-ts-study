import { FileSystem } from "@effect/platform/FileSystem"
import { Context, Effect, Layer, Option, Schema } from "effect"
import { StorageError, TodoRepository } from "../services/todo-repository.service"
import { Todo, TodoId, TodoSchema } from "../domain/todo.schema"

export class FileSystemTodoRepositoryConfig extends Context.Tag(
  "FileSystemTodoRepositoryConfig"
)<FileSystemTodoRepositoryConfig, {
  dataPath: string
}>() {}

const TodoDataTableSchema = Schema.Struct({
  entities: Schema.Record({ key: TodoId, value: TodoSchema }),
  ids: Schema.Array(TodoId),
})
type TodoDataTable = Schema.Schema.Type<typeof TodoDataTableSchema>;

const mapReadError = (err: { message: string }) =>
  new StorageError({
    reason: "read",
    message: err.message,
  })

const mapDecodeError = (message: string) =>
  new StorageError({
    reason: "decode",
    message,
  })

const parseFile = (fileText: string) => Effect.try({
  try: () => JSON.parse(fileText),
  catch: (error) =>
    mapDecodeError((error as Error).message),
})

const toTodoList = (table: TodoDataTable) =>
  Effect.forEach(table.ids, (id) => {
    const todo = table.entities[id]

    return todo
      ? Effect.succeed(todo)
      : Effect.fail(mapDecodeError(`Missing entity for id ${id}`))
  })

const toTodoTable = (...todos: ReadonlyArray<Todo>) => ({
  entities: Object.fromEntries(todos.map((todo) => [todo.id, todo])),
  ids: todos.map((todo) => todo.id),
})

const writeTodos = (
  fs: FileSystem,
  dataPath: string,
  todos: ReadonlyArray<Todo>
) =>
  fs.writeFileString(dataPath, JSON.stringify(toTodoTable(...todos))).pipe(
    Effect.mapError(
      (err) =>
        new StorageError({
          reason: "write",
          message: err.message,
        })
    )
  )

const readTodos = (fs: FileSystem, dataPath: string) =>
  Effect.gen(function* () {
    const todosJsonStr = yield* fs.readFileString(dataPath).pipe(
      Effect.mapError(mapReadError)
    )
    const todosJson = yield* parseFile(todosJsonStr)

    const table = yield* Schema.decodeUnknown(TodoDataTableSchema)(todosJson).pipe(
      Effect.mapError((err) => mapDecodeError(String(err)))
    )

    return yield* toTodoList(table)
  })

export const FileSystemTodoRepository = Layer.effect(
  TodoRepository,
  Effect.gen(function* () {
    const config = yield* FileSystemTodoRepositoryConfig
    const fs = yield* FileSystem

    const list = readTodos(fs, config.dataPath);
    const findById = (id: TodoId) => Effect.gen(function*() {
      const todos = yield* list;
      const matched = todos.find((todo: Todo) => todo.id === id);
      return matched ? Option.some(matched) : Option.none();
    });
    const upsertMany = (...todos: ReadonlyArray<Todo>) => Effect.gen(function*(){
      const existingTodos = yield* list;
      const updatedTodos = existingTodos.map((existingTodo: Todo) => {
        const update = todos.find((todo: Todo) => todo.id === existingTodo.id);
        if (!update) {
          return existingTodo;
        }
        return {
          ...existingTodo,
          ...update
        };
      });
      const newTodos = todos.filter(
        (todo: Todo) => !existingTodos.some((existingTodo: Todo) => existingTodo.id === todo.id)
      );
      const nextTodos = [...updatedTodos, ...newTodos];

      yield* writeTodos(fs, config.dataPath, nextTodos)

    }); 

    return {
      list,
      findById,
      upsertMany,
    }
  })
)
