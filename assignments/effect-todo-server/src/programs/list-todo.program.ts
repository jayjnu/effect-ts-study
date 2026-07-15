import { Effect } from "effect"
import { TodoRepository } from "../services/todo-repository.service"

export const listTodo = () =>
  Effect.gen(function* () {
    const repo = yield* TodoRepository
    return yield* repo.list
  })
