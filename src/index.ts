import { parseConstructorArgs } from './utils/constructor-parsing.js';
import { parseFunctionArgs } from './utils/function-parsing.js';
import DependencyGraph from './utils/DependencyGraph.js';

export interface IServiceContainer {
	/** Get the instance of a service by the service name */
	get<T>(name: string): Promise<T>;
	/** Get the instance of a service by the constructor */
	get<T>(ctor: Service<T>): Promise<T>;
	/** Set the instance for a service identified by a name */
	set<T>(name: string, service: T): IServiceContainer;
	/** Set the instance for a service identified by the constructor */
	set<T>(ctor: Service<T>, service: T): IServiceContainer;
	/** Define a class which */
	defineService<T>(ctor: Service<T>, options?: ServiceOptions<T>): IServiceContainer;
	/** Define a function which produces an instance of a service */
	defineFactory<T>(name: string, factory: Factory<T>, options?: FactoryOptions<T>): IServiceContainer;
	/** Define a way of creating a new instance of a service from an existing instance in a parent container */
	refineService<T>(ctor: Service<T>, refiner: Refiner<T>): IServiceContainer;
	/** Cleanup all service instances */
	close(): Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Factory<T> = (...args: any[]) => T | Promise<T>;

type Destructor<T> = (instance: T) => void | Promise<void>;

type FactoryOptions<T> = {
	destructor?: Destructor<T>,
}

type Refiner<T> = (input: T) => T | Promise<T>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service<T> = new (...args: any[]) => T;

type ServiceOptions<T> = {
	destructor?: Destructor<T>,
}

export class ServiceContainer implements IServiceContainer {

	/** A mapping of a service name to the current instance */
	private readonly instanceLookup: Map<string, unknown> = new Map();

	/** A mapping of service name to pending initializations */
	private readonly promiseLookup: Map<string, Promise<unknown>> = new Map();

	/** A mapping of a service name to its factory */
	private readonly factoryLookup: Map<string, () => Promise<unknown>> = new Map();

	/** A mapping of a service name to its destructor */
	private readonly destructorLookup: Map<string, Destructor<unknown>> = new Map();

	/** Tracks the dependency relationships between services */
	private readonly dependencyGraph = new DependencyGraph();

	constructor(private parent?: ServiceContainer) { }

	get<T>(nameOrCtor: string | Service<T>): Promise<T> {
		// Resolve the name if ctor was provided
		if (typeof nameOrCtor !== 'string') {
			const name = this.makeServiceId(nameOrCtor.name);
			if (name === undefined) {
				throw new Error(`The service '${nameOrCtor.name}' has not been defined`);
			}

			nameOrCtor = name;
		}

		return this.getService(nameOrCtor);
	}

	set<T>(name: string | Service<T>, service: T): this {
		if (typeof name !== 'string') {
			name = this.makeServiceId(name.name);
		}

		this.instanceLookup.set(name, service);
		return this;
	}

	defineService<T>(ctor: Service<T>, options?: ServiceOptions<T>): this {
		const name = this.makeServiceId(ctor.name);
		const dependencies = parseConstructorArgs(ctor);
		for (const dep of dependencies) {
			this.dependencyGraph.defineDep(name, dep);
		}

		return this.defineFactory<T>(name, async (): Promise<T> => {
			const args: unknown[] = [];
			for (const dep of dependencies) {
				args.push(await this.getService(dep));
			}

			return new ctor(...args);
		}, {
			destructor: options?.destructor
		});
	}

	defineFactory<T>(name: string, factory: Factory<T>, options?: FactoryOptions<T>): this {
		const dependencies = parseFunctionArgs(factory);
		for (const dep of dependencies) {
			this.dependencyGraph.defineDep(name, dep);
		}

		this.factoryLookup.set(name, async (): Promise<T> => {
			// Determine the dependencies of the 
			const args: unknown[] = [];
			for (const dep of dependencies) {
				args.push(await this.getService(dep));
			}

			const instance = factory(...args);
			if (instance instanceof Promise) {
				return instance;
			} else {
				return Promise.resolve(instance);
			}
		});

		if (options && options.destructor) {
			this.destructorLookup.set(name, options.destructor as Destructor<unknown>);
		}

		return this;
	}

	refineService<T>(ctor: Service<T>, refiner: Refiner<T>): this {
		const name = this.makeServiceId(ctor.name);
		return this.defineFactory<T>(name, async (): Promise<T> => {
			if (this.parent === undefined) {
				throw new Error('The refineService method can only be invoked on a ServiceContainer which has a parent');
			}

			const existing = await this.parent.get(ctor);
			const refined = refiner(existing);
			if (refined instanceof Promise) {
				return refined;
			} else {
				return Promise.resolve(refined);
			}
		});
	}

	refineFactory<T>(name: string, refiner: Refiner<T>): this;
	refineFactory<T>(factory: Factory<T>, refiner: Refiner<T>): this;
	refineFactory<T>(nameOrFactory: string | Factory<T>, refiner: Refiner<T>): this {
		const name = typeof nameOrFactory === 'string' ? nameOrFactory : nameOrFactory.name;
		return this.defineFactory<T>(name, async (): Promise<T> => {
			if (this.parent === undefined) {
				throw new Error('The refineService method can only be invoked on a ServiceContainer which has a parent');
			}

			const existing = await this.parent.get<T>(name);
			const refined = refiner(existing);
			if (refined instanceof Promise) {
				return refined;
			} else {
				return Promise.resolve(refined);
			}
		});
	}

	private makeServiceId(name: string) {
		return name.charAt(0).toLowerCase() + name.slice(1);
	}

	private async getService<T>(name: string): Promise<T> {

		// Check for a cached instance first
		const existingInstance = this.instanceLookup.get(name);
		if (existingInstance !== undefined) {
			return Promise.resolve(existingInstance as T);
		}

		// Check for a pending initialization
		const promise = this.promiseLookup.get(name);
		if (promise !== undefined) {
			return promise as Promise<T>;
		}

		// Fetch the factory
		const factory = this.factoryLookup.get(name);
		if (factory === undefined) {
			if (this.parent !== undefined) {
				return this.parent.getService<T>(name);
			} else {
				throw new Error(`The service with id '${name}' has not been defined`);
			}
		}

		// Create the instance
		const factoryResult = factory();
		if (factoryResult instanceof Promise) {
			this.promiseLookup.set(name, factoryResult);
			const builtInstance = await factoryResult;
			this.promiseLookup.delete(name);
			this.instanceLookup.set(name, builtInstance);
			return builtInstance as T;
		} else {
			this.instanceLookup.set(name, factoryResult);
			return Promise.resolve(factoryResult as T);
		}
	}

	async close() {
		// Create an inverted dependency graph so the shutdown can happen in the opposite order
		const shutdownGraph = this.dependencyGraph.invert();

		// Ensure that all pending services have resolved
		await Promise.all(this.promiseLookup.values());

		// Run all defined destructors on all instantiated services
		for (const name of shutdownGraph.topologicalSort()) {
			const dtor = this.destructorLookup.get(name);
			if (!dtor) {
				continue;
			}

			const instance = this.instanceLookup.get(name);
			if (instance !== undefined) {
				const result = dtor(instance);
				if (result instanceof Promise) {
					await result;
				}
			}
		}
	}
}

