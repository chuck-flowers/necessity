import assert from 'assert';
import { it } from 'node:test';
import { normalizeMaybePromises } from '../../../src/utils/promises.js';

await it('normalizes non-promise array', () => {
	const result = normalizeMaybePromises([1, 2, 3]);
	assert.deepStrictEqual(result, [1, 2, 3]);
});

await it('normalizes promise array', async () => {
	const result = normalizeMaybePromises([
		Promise.resolve(1),
		Promise.resolve(2),
		Promise.resolve(3),
	]);

	assert(result instanceof Promise);
	assert.deepStrictEqual(await result, [1, 2, 3]);
});

await it('normalizes heterogenous array', async () => {
	const result = normalizeMaybePromises([
		Promise.resolve(1),
		2,
		Promise.resolve(3),
	]);

	assert(result instanceof Promise);
	assert.deepStrictEqual(await result, [1, 2, 3]);
});

