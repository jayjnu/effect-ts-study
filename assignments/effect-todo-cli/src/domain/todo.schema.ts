import {Date, filter, Literal, maxLength, minLength, nonEmptyString, String, Struct, UUID} from 'effect/Schema';

export const TodoId = UUID;
export const TodoState = Literal('todo', 'in-progress', 'done');
export const TodoStateLiterals = TodoState.literals;
const TodoTitle = String.pipe(
    nonEmptyString(),
    minLength(4),
    maxLength(20)
);

export const TodoSchema = Struct({
    id: TodoId,
    state: TodoState,
    title: TodoTitle,
    createdAt: Date,
    updatedAt: Date,
}).pipe(filter((todo) => {
    if (todo.updatedAt.getTime() <= todo.createdAt.getTime()) {
        return 'updatedAt must be later than createdAt'
    }
}));
