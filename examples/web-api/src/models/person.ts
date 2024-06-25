import { Type, Static } from '@sinclair/typebox';

export type Person = Static<typeof person>;
export const person = Type.Object({
	id: Type.Integer(),
	firstName: Type.String(),
	lastName: Type.String(),
	age: Type.Integer(),
});

export type NewPerson = Static<typeof newPerson>;
export const newPerson = Type.Omit(person, ['id']);

export type EditPerson = Static<typeof editPerson>;
export const editPerson = Type.Partial(newPerson);
