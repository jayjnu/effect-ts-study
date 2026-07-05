import { Clock, Effect } from "effect";
import { TodoRepository } from "../services/todo-repository.service";
import { CreateTodo } from "../domain/todo.schema";
import { createTodo } from "../domain/todo.model";
import { IdGenerator } from "../services/id-generator.service";

export const addTodo = (todoInit: CreateTodo) => Effect.gen(function*() {
    const todoRepo = yield* TodoRepository;
    const idGen = yield* IdGenerator;
    const todoId = yield* idGen.nextId;
    const now = yield* Clock.currentTimeMillis;
    const todo = createTodo(todoInit, todoId, new Date(now));

    yield* todoRepo.upsertMany(todo);

    return todo;
});