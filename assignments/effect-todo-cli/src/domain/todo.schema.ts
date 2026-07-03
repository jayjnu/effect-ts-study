import {Date, filter, Literal, maxLength, minLength, nonEmptyString, String, Struct} from 'effect/Schema';

const TodoState = Literal('todo', 'in-progress', 'done');
const TodoTitle = String.pipe(
    nonEmptyString(),
    minLength(4),
    maxLength(20)
);

export const TodoSchema = Struct({
    state: TodoState,
    title: TodoTitle,
    createdAt: Date,
    updatedAt: Date,
}).pipe(filter((todo) => {
    if (todo.updatedAt.getTime() <= todo.createdAt.getTime()) {
        return 'updatedAt must be later than createdAt'
    }
}));
