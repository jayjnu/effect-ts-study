import {Date, filter, Literal, maxLength, minLength, nonEmptyString, String, Struct, Schema, UUID} from 'effect/Schema';

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
    createdAt: Date,
    updatedAt: Date,
}).pipe(filter((todo) => {
    if (todo.updatedAt.getTime() <= todo.createdAt.getTime()) {
        return 'updatedAt must be later than createdAt'
    }
}));

export type Todo = Schema.Type<typeof TodoSchema>;

export const CreateTodoSchema = Struct({
    title: TodoTitle
});

export type CreateTodo = Schema.Type<typeof CreateTodoSchema>;
