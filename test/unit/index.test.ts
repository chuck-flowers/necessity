import assert from 'node:assert';
import { describe, it } from 'node:test';
import ServiceContainer, { AsyncInitRequiredError } from '../../src/index.js';

describe('getters', () => {
it('gets single simple sync', () => {
	const container = loggerWithMap();

	const { logger } = container.getSync({ logger: true })

	assert.equal(logger, console);
});

it('gets many simple sync', () => {
	const container = loggerWithMap();

	const { logger, map } = container.getSync({ logger: true, map: true });

	assert.equal(logger, console);
	assert(map instanceof Map);
})

it('gets single simple async', async () => {
	const container = asyncLoggerWithMap();

	const { logger } = await container.get({ logger: true });
	assert.equal(logger, console);
});

it('gets many simple async', async () => {
	const container = asyncLoggerWithMap();

	const { logger, map } = await container.get({ logger: true, map: true })

	assert.equal(logger, console);
	assert(map instanceof Map);
});

it('gets complex instance', async () => {
	const container = configuredLogger();

	const { config, logger } = await container.get({ logger: true, config: true });
	assert.equal(typeof config, 'object');
	assert.equal(typeof logger, 'object');
});

});

it('fails when fetching async as sync', () => {
	const container = ServiceContainer.create()
		.defineAsyncFactory('logger', async () => console);

	assert.throws(() => {
		container.getSync({ logger: true })
	}, AsyncInitRequiredError);
});

it('tests successfully when fully configured', () => {
	const container = configuredLogger();
	const result = container.test('logger');
	assert(result);
});

it('fails when testing on partial configuration', () => {
	const container = ServiceContainer.create()
		.defineFactory('logger', (config) => console);
	
	const result = container.test('logger');
	assert(!result);
});

it('tests successfully when asserting sync', () => {
	throw new Error('TODO');
});

it('tests unsuccessfully with async dependency', () => {
	throw new Error('TODO');
});

function loggerWithMap() {
	return ServiceContainer.create()
		.defineFactory('logger', () => console)
		.defineFactory('map', () => new Map<string, number>());
}

function asyncLoggerWithMap() {
	return ServiceContainer.create()
		.defineAsyncFactory('logger', async () => console)
		.defineAsyncFactory('map', async () => new Map<string, number>());
}

function configuredLogger() {
	type Config = { level: 'debug' };
	type Logger = { debug(message: string): void };
	return ServiceContainer.create()
		.defineFactory('config', (): Config => ({ level: 'debug' }))
		.defineFactory('logger', (config: Config): Logger => ({
			debug(message: string) {
				if (config.level === 'debug') {
					console.debug(message);
				}
			}
		}))
}

