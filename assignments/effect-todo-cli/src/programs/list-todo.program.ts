import { Effect } from "effect";
import { TodoRepository } from "../services/todo-repository.service";

export const listTodo = () => Effect.gen(function*() {
    const todoRepo = yield* TodoRepository;
    const todos = yield* todoRepo.list;
    return todos;
});