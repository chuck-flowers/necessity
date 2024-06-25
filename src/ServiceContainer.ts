import DependencyGraph from "./utils/DependencyGraph.js";
import { parseConstructorArgs } from "./utils/constructor-parsing.js";
import { parseFunctionArgs } from "./utils/function-parsing.js";

export class ServiceContainer<
	Mapping extends ServiceMapping,
> {
	private readonly depGraph = new DependencyGraph();
	private readonly factoryLookup = {} as FactoryLookup<Mapping>;
	private readonly dtorLookup = {} as DtorLookup<Mapping>;
	private readonly instanceLookup = {} as Partial<Mapping>;

	constructor(
		mapping: ContainerDefinition<Mapping>,
		private readonly parent?: ServiceContainer<Record<string, unknown>>
	) {
		for (const [key, value] of Object.entries(mapping)) {
			this.defineService(key, value);
		}
	}

	defineService<K extends ServiceKey, S>(
		serviceId: K,
		serviceDefinition: ServiceDefinition<S>
	): ServiceContainer<Mapping & { [T in K]: S }> {
		type Key = keyof Mapping;

		const serviceOptions = this.normalizeServiceDef(serviceDefinition);
		const factory = this.compileFactory(serviceId, serviceOptions);
		this.factoryLookup[serviceId as Key] = factory as () => Promise<Mapping[Key]>;
		return this as ServiceContainer<Mapping & { [T in K]: S }>;
	}

	async get<K extends keyof Mapping>(key: K): Promise<Mapping[K]> {
		// Check for existing instance
		if (key in this.instanceLookup) {
			return this.instanceLookup[key] as Mapping[K];
		}

		// If there's no factory defined, defer to the parent container where available
		const factory = this.factoryLookup[key] as (() => Mapping[K]) | undefined;
		if (factory === undefined) {
			if (this.parent !== undefined) {
				return this.parent.get(key as string) as Mapping[K];
			} else {
				throw new Error(`No definition for the service "${String(key)}" was found`)
			}
		}

		// Construct the instance and save it to the map
		const instance = factory();
		this.instanceLookup[key] = instance;
		return instance;
	}

	child<M extends ServiceMapping>(mapping: ContainerDefinition<M>): ServiceContainer<Mapping & M> {
		return new ServiceContainer<Mapping & M>(
			mapping as ContainerDefinition<M & Mapping>,
			this as ServiceContainer<Record<string, unknown>>
		);
	}

	async close(): Promise<void> {
		// Create an inverted dependency graph so the shutdown can happen in the opposite order
		const shutdownGraph = this.depGraph.invert();

		// Ensure that all pending services have resolved
		await Promise.all(Object.values(this.instanceLookup).filter(x => x instanceof Promise));

		// Run all defined destructors on all instantiated services
		for (const name of shutdownGraph.topologicalSort()) {
			const dtor = this.dtorLookup[name];
			if (!dtor) {
				continue;
			}

			const instance = this.instanceLookup[name];
			if (instance !== undefined) {
				const result = dtor(instance);
				if (result instanceof Promise) {
					await result;
				}
			}
		}
	}

	private normalizeServiceDef<T>(def: ServiceDefinition<T>): ServiceOptions<T> {
		if (typeof def === 'function') {
			return {
				service: def
			}
		}

		return def;
	}

	private compileFactory<T>(serviceKey: ServiceKey, options: ServiceOptions<T>): () => T | Promise<T> {
		console.log('compileFactory', {serviceKey, options });
		let type: 'class' | 'function';
		let deps: string[];
		const stringDef = options.service.toString();
		if (stringDef.startsWith('class')) {
			type = 'class';
			deps = parseConstructorArgs(options.service as ServiceConstructor<T>);
		} else if (stringDef.startsWith('function') || stringDef.startsWith('(')) {
			type = 'function';
			deps = parseFunctionArgs(options.service as ServiceFactory<T>);
		} else {
			throw new Error(`Unable to determine init type of ${serviceKey}: ${stringDef}`);
		}

		// Parse deps
		for (const dep of deps) {
			this.depGraph.defineDep(serviceKey, dep);
		}

		return (): T | Promise<T> => {
			const args: (unknown | Promise<unknown>)[] = deps.map((x): unknown | Promise<unknown> => {
				if (x in this.instanceLookup) {
					return this.instanceLookup[x as keyof Mapping] as T | Promise<T>;
				}

				const subFactory = this.factoryLookup[x as keyof Mapping] as () => Mapping[keyof Mapping];
				console.log('subFactory ' + x + ' is of type ' + typeof subFactory);
				const instance = subFactory();
				this.instanceLookup[x as keyof Mapping] = instance;

				return instance;
			});

			if (args.some(x => x instanceof Promise)) {
				return Promise.all(args.map(arg => arg instanceof Promise ? arg : Promise.resolve(arg)))
					.then(args => invokeRootFactory(args));
			} else {
				return invokeRootFactory(args);
			}

			function invokeRootFactory(args: unknown[]) {
				switch (type) {
					case 'class':
						return new (options.service as new (...args: unknown[]) => T)(...args);
					case 'function':
						return (options.service as (...args: unknown[]) => T)(...args);
				}
			}
		}
	}
}

type ServiceKey = string;

type ServiceMapping = {
	[x: string]: unknown
}

type ContainerDefinition<M extends ServiceMapping> = {
	[K in keyof M]: ServiceDefinition<M[K]>
}

type ServiceDefinition<T> =
	| ServiceFactory<T>
	| ServiceConstructor<T>
	| ServiceOptions<T>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceFactory<T> = (...args: any[]) => T;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceConstructor<T> = new (...args: any[]) => T;

type ServiceOptions<T> = {
	service: ServiceFactory<T> | ServiceConstructor<T>,
	dtor?: (instance: T) => void | Promise<void>,
}

type FactoryLookup<M extends ServiceMapping> = {
	[K in keyof M]: () => M[K] | Promise<M[K]>
}

type DtorLookup<M extends ServiceMapping> = {
	[K in keyof M]?: (x: M[K]) => void | Promise<void>
};

