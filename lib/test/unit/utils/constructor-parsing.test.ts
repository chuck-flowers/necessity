import assert from 'node:assert';
import test from 'node:test';
import { parseConstructorArgs } from '../../../src/utils/constructor-parsing.js';

await test.describe('Constructor Parsing', async () => {
	await test('no constructor', () => {
		class Foo { }

		const deps = parseConstructorArgs(Foo);

		assert.deepStrictEqual(deps, []);
	});

	await test('empty constructor', () => {
		class Foo {
			constructor() { }
		}

		const deps = parseConstructorArgs(Foo);

		assert.deepStrictEqual(deps, []);
	});

	await test('single param', () => {
		class Foo {
			constructor(public foo: number) {

			}
		}

		const deps = parseConstructorArgs(Foo);

		assert.deepStrictEqual(deps, ['foo']);
	});

	await test('two params', () => {

		class Foo {
			constructor(public foo: number, public bar: string) {

			}
		}

		const deps = parseConstructorArgs(Foo);

		assert.deepStrictEqual(deps, ['foo', 'bar']);
	});

	await test('three params', () => {

		class Foo {
			constructor(public foo: number, public bar: string, public baz: boolean) {

			}
		}

		const deps = parseConstructorArgs(Foo);

		assert.deepStrictEqual(deps, ['foo', 'bar', 'baz']);
	})
});

