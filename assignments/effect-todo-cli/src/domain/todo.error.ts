import { Data } from "effect";
import { type TodoStateLiterals } from "./todo.schema";

export class TodoNotFoundError extends Data.TaggedError('TodoNotFoundError')<{
    readonly id: string;
}> {}

export class InvalidTodoStateTransitionError extends Data.TaggedError('InvalidTodoStateTransitionError')<{
    readonly from: typeof TodoStateLiterals[number];
    readonly to: typeof TodoStateLiterals[number];
}> {}

export class TodoAlreadyCompletedError extends Data.TaggedError('TodoAlreadyCompletedError')<{
    readonly id: string;
}> {}

export class InvalidTodoTimelineError extends Data.TaggedError('InvalidTodoTimelineError') {}
