import assert from 'node:assert';
import test from 'node:test';
import ServiceContainer from '../../src/ServiceContainer.js';

await test('no dependencies', async () => {
	const container = createServiceContainer();

	const logger = await container.get('logger');
	assert(logger);
	assert('log' in logger);
});

await test('single dependency', async () => {
	const container = createServiceContainer();

	const repo = await container.get('repo');
	const logger = await container.get('logger');
	repo.insert('Value');
	assert(logger.log.mock.callCount() > 0);
});

await test('multiple dependencies', async () => {

});

function createServiceContainer() {
	type Logger = { log(message: string): void };
	return ServiceContainer.new({
		cache: class {
			private map = new Map<string, string>();

			constructor(private readonly logger: Logger) { }

			put(key: string, value: string) {
				this.logger.log(`Putting ${key} = ${value}`);
				this.map.set(key, value);
			}

			get(key: string) {
				this.logger.log('Getting ' + key);
				return this.map.get(key);
			}
		},
		logger: () => ({
			log: test.mock.fn(),
		} satisfies Logger),
		repo: class {
			constructor(private readonly logger: Logger) {

			}

			insert(value: string) {
				this.logger.log('Inserting ' + value);
			}
		}
	});
}

