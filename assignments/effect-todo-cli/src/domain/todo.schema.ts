import { DateTime } from 'effect';
import {filter, Literal, maxLength, minLength, nonEmptyString, String, Struct, Schema, UUID, DateTimeUtc} from 'effect/Schema';

export const TodoId = UUID;
export type TodoId = Schema.Type<typeof TodoId>;
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
    createdAt: DateTimeUtc,
    updatedAt: DateTimeUtc,
}).pipe(filter((todo) => {
    if (DateTime.lessThan(todo.updatedAt, todo.createdAt)) {
        return 'updatedAt cannot be earlier than createdAt'
    }
}));

export type Todo = Schema.Type<typeof TodoSchema>;

export const CreateTodoSchema = Struct({
    title: TodoTitle
});

export type CreateTodo = Schema.Type<typeof CreateTodoSchema>;
