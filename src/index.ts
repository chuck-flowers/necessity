import { ClassDecContext, DecoratedClass } from './models/decorators.js';
import { parseConstructorArgs } from './utils/constructor-parsing.js';
import { parseFunctionArgs } from './utils/function-parsing.js';

export interface IServiceContainer {
	/** Get the instance of a service by the service name */
	get<T>(name: string): T;
	/** Get the instance of a service by the constructor */
	get<T>(ctor: new (...args: any[]) => T): T;
	/** Set the instance for a service identified by a name */
	set<T>(name: string, service: T): void;
	/** Set the instance for a service identified by the constructor */
	set<T>(ctor: new (...args: any[]) => T, service: T): void;
	/** Define a class which */
	defineService<T>(ctor: new (...args: any[]) => T, depedencies: string[]): void;
	/** Define a function which produces an instance of a service */
	defineFactory<T>(factory: (...args: any[]) => T, name?: string): void;
	/** Define a way of creating a new instance of a service from an existing instance in a parent container */
	refineFactory<T>(ctor: new (...args: any[]) => T, refiner: (input: T) => T): void;
}

export class ServiceContainer implements IServiceContainer {
	/** A mapping of a service name to its factory */
	private readonly factoryLookup: Map<string, () => any> = new Map();

	/** A mapping of a service name to the current instance */
	private readonly instanceLookup: Map<string, any> = new Map();

	constructor(private parent?: ServiceContainer) { }

	get<T>(nameOrCtor: string | (new (...args: any) => T)): T {
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

	set<T>(name: string | (new (...args: any[]) => T), service: T): void {
		if (typeof name !== 'string') {
			name = this.makeServiceId(name.name);
		}

		this.instanceLookup.set(name, service);
	}

	defineService<T>(ctor: new (...args: any[]) => T): void {
		const name = this.makeServiceId(ctor.name);
		const dependencies = parseConstructorArgs(ctor);
		this.defineFactory((): T => {
			const args: any[] = [];
			for (const dep of dependencies) {
				args.push(this.getService(dep));
			}

			return new ctor(...args);
		}, name);
	}

	defineFactory<T>(factory: (...args: any[]) => T, name?: string) {
		if (name === undefined) {
			name = this.makeServiceId(factory.name);
			if (name === '') {
				throw new Error('Unable to determine the name of the factory: ' + factory.toString());
			}
		}

		const dependencies = parseFunctionArgs(factory);

		this.factoryLookup.set(name, (): T => {
			const args: any[] = [];
			for (const dep of dependencies) {
				args.push(this.getService(dep));
			}

			return factory(...args);
		});
	}

	refineFactory<T>(ctor: new (...args: any[]) => T, refiner: (input: T) => T) {
		const name = this.makeServiceId(ctor.name);
		this.defineFactory(() => {
			if (this.parent === undefined) {
				throw new Error('refineFactory can only be invoked on a ServiceContainer which has a parent');
			}

			const existing = this.parent.get(ctor);
			const refined = refiner(existing);
			return refined;
		}, name)
	}

	readonly register = <T>(value: DecoratedClass<T>) => {
		this.defineService(value as unknown as (new (...args: any[]) => any));
	}

	private makeServiceId(name: string) {
		return name.charAt(0).toLowerCase() + name.slice(1);
	}

	private getService<T>(name: string): T {
		let instance = this.instanceLookup.get(name);

		// Create the instance
		if (instance === undefined) {
			const ctor = this.factoryLookup.get(name);
			if (ctor === undefined) {
				if (this.parent !== undefined) {
					return this.parent.getService<T>(name);
				} else {
					throw new Error(`The service with id '${name}' has not been defined`);
				}
			}

			instance = ctor();
			this.instanceLookup.set(name, instance);
		}

		return instance;
	}
}

