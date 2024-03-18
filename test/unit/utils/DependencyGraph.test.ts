import assert from 'node:assert';
import { describe, test } from 'node:test';
import DependencyGraph from '../../../src/utils/DependencyGraph.js';

await describe('Topological Sort', async () => {
	await test('it sorts a trivial example', () => {
		const graph = new DependencyGraph();
		graph.defineDep('a', 'b');
		graph.defineDep('b', 'c');

		const result = Array.from(graph.topologicalSort());

		assert.deepStrictEqual(result, ['c', 'b', 'a']);
	});

	await test('it sorts a branching example', () => {
		const graph = new DependencyGraph();
		graph.defineDep('a', 'b');
		graph.defineDep('a', 'c');

		const result = Array.from(graph.topologicalSort());
		const a = result.findIndex(x => x === 'a');
		const b = result.findIndex(x => x === 'b');
		const c = result.findIndex(x => x === 'c');

		// Ensure all elements are found
		assert.notEqual(a, -1);
		assert.notEqual(b, -1);
		assert.notEqual(c, -1);

		// Ensure the order is correct
		assert(c < a);
		assert(b < a);
	})
});

