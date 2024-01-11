import assert from 'node:assert';
import { it } from 'node:test';
import { parseConstructorArgs } from '../../../src/utils/constructor-parsing.js';

it('parses no constructor', () => {
	class Foo { }

	const deps = parseConstructorArgs(Foo);

	assert.deepStrictEqual(deps, []);
});

it('parses empty constructor', () => {
	class Foo {
		constructor() { }
	}

	const deps = parseConstructorArgs(Foo);

	assert.deepStrictEqual(deps, []);
});

it('parses single param', () => {
	class Foo {
		constructor(public foo: number) {

		}
	}

	const deps = parseConstructorArgs(Foo);

	assert.deepStrictEqual(deps, ['foo']);
});

it('parses two params', () => {

	class Foo {
		constructor(public foo: number, public bar: string) {

		}
	}

	const deps = parseConstructorArgs(Foo);

	assert.deepStrictEqual(deps, ['foo', 'bar']);
});

it('parses three params', () => {

	class Foo {
		constructor(public foo: number, public bar: string, public baz: boolean) {

		}
	}

	const deps = parseConstructorArgs(Foo);

	assert.deepStrictEqual(deps, ['foo', 'bar', 'baz']);
})
