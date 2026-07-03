import { describe, expect, it } from "vitest"

import {
  InvalidTodoStateTransitionError,
  InvalidTodoTimelineError,
  TodoAlreadyCompletedError,
  TodoNotFoundError,
} from "../../src/domain/todo.error"

describe("todo domain errors", () => {
  it("exposes business-meaningful tagged errors", () => {
    const notFound = new TodoNotFoundError({ id: "todo-1" })
    const alreadyCompleted = new TodoAlreadyCompletedError({ id: "todo-1" })
    const invalidTimeline = new InvalidTodoTimelineError()
    const invalidTransition = new InvalidTodoStateTransitionError({
      from: "todo",
      to: "done",
    })

    expect(notFound._tag).toBe("TodoNotFoundError")
    expect(notFound.id).toBe("todo-1")

    expect(alreadyCompleted._tag).toBe("TodoAlreadyCompletedError")
    expect(alreadyCompleted.id).toBe("todo-1")

    expect(invalidTimeline._tag).toBe("InvalidTodoTimelineError")

    expect(invalidTransition._tag).toBe("InvalidTodoStateTransitionError")
    expect(invalidTransition.from).toBe("todo")
    expect(invalidTransition.to).toBe("done")
  })
})
