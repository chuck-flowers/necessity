import { it, expect } from 'vitest';
import { parseConstructorArgs } from '../../../src/utils/constructor-parsing';

it('parses no constructor', () => {
	class Foo { }

	const deps = parseConstructorArgs(Foo);

	expect(deps).toStrictEqual([]);
});

it('parses empty constructor', () => {
	class Foo {
		constructor() { }
	}

	const deps = parseConstructorArgs(Foo);

	expect(deps).toStrictEqual([]);
});

it('parses single param', () => {
	class Foo {
		constructor(foo: number) {

		}
	}

	const deps = parseConstructorArgs(Foo);

	expect(deps).toStrictEqual(['foo']);
});

it('parses two params', () => {

	class Foo {
		constructor(foo: number, bar: string) {

		}
	}

	const deps = parseConstructorArgs(Foo);

	expect(deps).toStrictEqual(['foo', 'bar']);
});

it('parses three params', () => {

	class Foo {
		constructor(foo: number, bar: string, baz: boolean) {

		}
	}

	const deps = parseConstructorArgs(Foo);

	expect(deps).toStrictEqual(['foo', 'bar', 'baz']);
})
