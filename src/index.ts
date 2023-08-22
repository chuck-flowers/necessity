import { ClassDecContext, DecoratedClass } from './models/decorators.js';
import CtorParser from './services/CtorParser.js';

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
	defineFactory<T>(factory: () => T, name?: string): void;
	/** Define a way of creating a new instance of a service from an existing instance in a parent container */
	refineFactory<T>(ctor: new (...args: any[]) => T, refiner: (input: T) => T): void;
}

export class ServiceContainer implements IServiceContainer {
	/** A mapping of a service name to its factory */
	private readonly factoryLookup: Map<string, () => any> = new Map();

	/** A mapping of a service name to the current instance */
	private readonly instanceLookup: Map<string | (new (...args: any[]) => any), any> = new Map();

	/** The object used to parse information from a constructor definition */
	private ctorParser = new CtorParser();

	constructor(private parent?: ServiceContainer) { }

	get<T>(nameOrCtor: string | (new (...args: any) => T)): T {
		// Resolve the name if ctor was provided
		if (typeof nameOrCtor !== 'string') {
			const name = this.makeServiceId(nameOrCtor.name);
			if (name === undefined) {
				throw new Error(`The service '${nameOrCtor.name}' has not been defined`);
			}

			return this.getService(name);
		}

	}

	set<T>(name: string | (new (...args: any[]) => T), service: T): void {
		this.instanceLookup.set(name, service);
	}

	defineService<T>(ctor: new (...args: any[]) => T, dependencies: string[]): void {
		const name = this.makeServiceId(ctor.name);
		this.defineFactory((): T => {
			const args: any[] = [];
			for (const dep of dependencies) {
				args.push(this.getService(dep));
			}

			return new ctor(...args);
		}, name);
	}

	defineFactory<T>(factory: () => T, name?: string) {
		if (name === undefined) {
			name = this.makeServiceId(factory.name);
			if (name === '') {
				throw new Error('Unable to determine the name of the factory: ' + factory.toString());
			}
		}

		this.factoryLookup.set(name, factory);
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
		const dependencies = this.ctorParser.parseCtor(value);
		this.defineService(value as unknown as (new (...args: any[]) => any), dependencies);
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

