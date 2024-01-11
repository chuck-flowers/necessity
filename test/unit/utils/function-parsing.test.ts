import assert from 'assert';
import { it } from 'node:test';
import { parseFunctionArgs } from '../../../src/utils/function-parsing.js';

it('parses args of arrow function', () => {
	const result = parseFunctionArgs((a, b, c) => {
		console.log(a, b, c);
	});
	assert.deepStrictEqual(result, ['a', 'b', 'c']);
});

it('parses args of anonymous function', () => {
	const result = parseFunctionArgs(function (a, b, c) {
		console.log(a, b, c);
	});

	assert.deepStrictEqual(result, ['a', 'b', 'c']);
});

it('parses args of named function', () => {
	function foo(a: unknown, b: unknown, c: unknown) {
		console.log(a, b, c);
	}

	const result = parseFunctionArgs(foo);
	assert.deepStrictEqual(result, ['a', 'b', 'c']);
});

it('parses no args of arrow function', () => {
	const result = parseFunctionArgs(() => {});
	assert.deepStrictEqual(result, []);
});

it('parses no parentheses of arrow function', () => {
	const result = parseFunctionArgs(x => ({ x }))
	assert.deepStrictEqual(result, ['x']);
});

it('parses no args of anonymous function', () => {
	const result = parseFunctionArgs(function() {});
	assert.deepStrictEqual(result, []);
});

it('parses no args of named function', () => {
	function foo() {}
	const result = parseFunctionArgs(foo);
	assert.deepStrictEqual(result, []);
});

