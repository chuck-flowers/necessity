import assert from 'node:assert';
import test from 'node:test';
import ServiceContainer from '../../src/ServiceContainer.js';

class Cache {
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
}

type Logger = { log(message: string): void };

class Repo {
	constructor(
		private readonly logger: Logger,
		private readonly cache: Cache,
	) {

	}

	insert(key:string, value: string) {
		this.logger.log('Inserting ' + key + ' = ' + value);
		this.cache.put(key, value);
	}

	read(key: string) {
		this.logger.log('Reading ' + key)
		return this.cache.get(key);
	}
}

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
	repo.insert('Key', 'Value');
	assert(logger.log.mock.callCount() > 0);
});

await test('parent container', async () => {
	const parent = createServiceContainer();
	const child = createChildContainer(parent);

	const console = child.get('consoleLogger');
	const logger = child.get('logger');

	assert(console);
	assert(logger);
});

function createServiceContainer() {
	return new ServiceContainer({
		cache: Cache,
		logger: () => ({
			log: test.mock.fn(),
		} satisfies Logger),
		repo: Repo
	});
}

function createChildContainer(parent: ReturnType<typeof createServiceContainer>) {
	return parent.child({
		consoleLogger: () => console,
	});
}

