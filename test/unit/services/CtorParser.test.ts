import { it, expect } from 'vitest';
import CtorParser from '../../../src/services/CtorParser';

const service = new CtorParser();

it('parses no constructor', () => {
	class Foo { }

	const deps = service.parseCtor(Foo);

	expect(deps).toStrictEqual([]);
});

it('parses empty constructor', () => {
	class Foo {
		constructor() { }
	}

	const deps = service.parseCtor(Foo);

	expect(deps).toStrictEqual([]);
});

it('parses single param', () => {
	class Foo {
		constructor(foo: number) {

		}
	}

	const deps = service.parseCtor(Foo);

	expect(deps).toStrictEqual(['foo']);
});

it('parses two params', () => {

	class Foo {
		constructor(foo: number, bar: string) {

		}
	}

	const deps = service.parseCtor(Foo);

	expect(deps).toStrictEqual(['foo', 'bar']);
});

it('parses three params', () => {

	class Foo {
		constructor(foo: number, bar: string, baz: boolean) {

		}
	}

	const deps = service.parseCtor(Foo);

	expect(deps).toStrictEqual(['foo', 'bar', 'baz']);
})
