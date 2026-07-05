import { Context, Data, Effect, Option } from "effect";
import { Todo, TodoId } from "../domain/todo.schema";

export class StorageError extends Data.TaggedError('StorageError')<{
  readonly reason: 'read' | 'write' | 'encode' | 'decode';
  readonly message?: string;
}> {}

type FindTodoById = (id: TodoId) => Effect.Effect<Todo, StorageError>;
type ListTodos = Effect.Effect<ReadonlyArray<Todo>, StorageError>;
type UpsertMany = (...todos: ReadonlyArray<Todo>) => Effect.Effect<void, StorageError>;

export interface TodoRepositoryShape {
  findById: FindTodoById;
  list: ListTodos;
  upsertMany: UpsertMany;
}

export class TodoRepository extends Context.Tag('TodoRepository')<TodoRepository, TodoRepositoryShape>() {}