import { Console, Effect } from "effect"

const main = Console.log("effect-todo-server scaffold")

void Effect.runPromise(main)
