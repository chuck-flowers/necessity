import { expect, it } from 'vitest';
import { parseFunctionArgs } from '../../../src/utils/function-parsing';

it('parses args of arrow function', () => {
	const result = parseFunctionArgs((a, b, c) => {});
	expect(result).toStrictEqual(['a', 'b', 'c']);
});

it('parses args of anonymous function', () => {
	const result = parseFunctionArgs(function (a, b, c) {});
	expect(result).toStrictEqual(['a', 'b', 'c']);
});

it('parses args of named function', () => {
	function foo(a, b, c) {

	}

	const result = parseFunctionArgs(foo);
	expect(result).toStrictEqual(['a', 'b', 'c']);
});

it('parses no args of arrow function', () => {
	const result = parseFunctionArgs(() => {});
	expect(result).toStrictEqual([]);
});

it('parses no args of anonymous function', () => {
	const result = parseFunctionArgs(function() {});
	expect(result).toStrictEqual([]);
});

it('parses no args of named function', () => {
	function foo() {}
	const result = parseFunctionArgs(foo);
	expect(result).toStrictEqual([]);
});
