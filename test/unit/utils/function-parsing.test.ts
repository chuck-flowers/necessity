import assert from 'assert';
import test from 'node:test';
import { parseFunctionArgs } from '../../../src/utils/function-parsing.js';

await test.describe('Function Parsing', async () => {
	test('arrow function', () => {
		const result = parseFunctionArgs((a, b, c) => {
			console.log(a, b, c);
		});
		assert.deepStrictEqual(result, ['a', 'b', 'c']);
	});

	test('arrow function with parentheses', () => {
		const result = parseFunctionArgs(x => ({ x }))
		assert.deepStrictEqual(result, ['x']);
	});

	test('anonymous function', () => {
		const result = parseFunctionArgs(function (a, b, c) {
			console.log(a, b, c);
		});

		assert.deepStrictEqual(result, ['a', 'b', 'c']);
	});

	test('named function', () => {
		function foo(a: unknown, b: unknown, c: unknown) {
			console.log(a, b, c);
		}

		const result = parseFunctionArgs(foo);
		assert.deepStrictEqual(result, ['a', 'b', 'c']);
	});

	test('empty arrow function', () => {
		const result = parseFunctionArgs(() => {});
		assert.deepStrictEqual(result, []);
	});

	test('empty anonymous function', () => {
		const result = parseFunctionArgs(function() {});
		assert.deepStrictEqual(result, []);
	});

	test('empty named function', () => {
		function foo() {}
		const result = parseFunctionArgs(foo);
		assert.deepStrictEqual(result, []);
	});

});

