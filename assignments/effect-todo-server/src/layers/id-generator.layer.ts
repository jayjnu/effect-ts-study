import { Clock, Effect, Layer, Ref, Schema } from "effect"
import { TodoId } from "../domain/todo.schema"
import { IdGenerator } from "../services/id-generator.service"

export const IdGeneratorLive = Layer.effect(
  IdGenerator,
  Effect.gen(function* () {
    const counter = yield* Ref.make(0)
    return IdGenerator.of({
      nextTodoId: Effect.gen(function* () {
        const n = yield* Ref.getAndUpdate(counter, (v) => v + 1)
        const ms = yield* Clock.currentTimeMillis
        return Schema.decodeSync(TodoId)(`todo_${ms}_${n}`)
      }),
    })
  })
)
