import DependencyGraph from "./utils/DependencyGraph.js";
import { parseConstructorArgs } from "./utils/constructor-parsing.js";
import { parseFunctionArgs } from "./utils/function-parsing.js";

export class ServiceContainer<
	Mapping extends ServiceMapping,
> {
	static new<
		const M extends ServiceMapping
	>(mapping: { [K in keyof M]: ServiceDefinition<M[K]> }): ServiceContainer<M> {
		const toReturn = new ServiceContainer<M>();

		for (const [key, value] of Object.entries(mapping)) {
			const serviceOptions = toReturn.normalizeServiceDef(value as ServiceDefinition<M[keyof M]>);
			const factory = toReturn.compileFactory(key, serviceOptions);
			toReturn.factoryLookup[key as keyof M] = factory as () => Promise<M[keyof M]>;
		}

		return toReturn;
	}

	private readonly depGraph = new DependencyGraph();
	private readonly factoryLookup = {} as FactoryLookup<Mapping>;
	private readonly instanceLookup = {} as Partial<Mapping>;

	private constructor() { }

	async get<K extends keyof Mapping>(key: K): Promise<Mapping[K]> {
		// Check for existing instance
		if (key in this.instanceLookup) {
			return this.instanceLookup[key] as Mapping[K];
		}

		// Construct instance
		const factory = this.factoryLookup[key] as () => Mapping[K];
		const instance = factory();
		this.instanceLookup[key] = instance;
		return instance;
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

type ServiceDefinition<T> =
	| ServiceFactory<T>
	| ServiceConstructor<T>
	| ServiceOptions<T>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceFactory<T> = (...args: any[]) => T;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceConstructor<T> = new (...args: any[]) => T;

type ServiceOptions<T> = {
	service: ServiceFactory<T> | ServiceConstructor<T>
}

type FactoryLookup<M extends ServiceMapping> = {
	[K in keyof M]: () => M[K] | Promise<M[K]>
}

