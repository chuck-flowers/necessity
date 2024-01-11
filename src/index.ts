import { parseConstructorArgs } from './utils/constructor-parsing.js';
import { parseFunctionArgs } from './utils/function-parsing.js';
import { normalizeMaybePromises } from './utils/promises.js';

export default class ServiceContainer<K extends InstanceKey, M extends ContainerMapping<K>> {
	static create<K extends InstanceKey, M extends ContainerMapping<K>>(): ServiceContainer<K, M>;
	static create<K extends InstanceKey, M extends ContainerMapping<K>>(parent: ServiceContainer<K, M>): ServiceContainer<K, M>;
	static create<
		K extends InstanceKey = never,
		M extends { [T in K]: unknown } = never,
		P extends ServiceContainer<K, M> = never
	>(
		parent?: P
	): ServiceContainer<K, M> {
		return new ServiceContainer(parent);
	}

	private readonly nameToInstance: Map<keyof M, unknown> = new Map();

	private readonly nameToPending: Map<keyof M, Promise<unknown>> = new Map();

	private readonly nameToFactory: Map<keyof M, FactoryDefinition<K, unknown>> = new Map();

	private constructor(
		private parent?: ServiceContainer<K, M>
	) {
	}

	defineFactory<F extends InstanceKey, T>(name: F, factory: Factory<T>): ExtendedContainer<K, M, F, T> {
		const deps = parseFunctionArgs(factory) as K[];
		this.nameToFactory.set(name as unknown as K, {
			type: 'sync',
			name: name as unknown as K,
			deps,
			factory
		});

		return this as unknown as ExtendedContainer<K, M, F, T>;
	}

	defineAsyncFactory<F extends string, T>(name: F, factory: AsyncFactory<T>): ExtendedContainer<K, M, F, T> {
		const deps = parseFunctionArgs(factory) as K[];
		this.nameToFactory.set(name as unknown as K, {
			type: 'async',
			name: name as unknown as K,
			deps,
			factory
		});

		return this as unknown as ExtendedContainer<K, M, F, T>;
	}

	defineService<S extends string, T>(name: S, service: Service<T>): ExtendedContainer<K, M, S, T> {
		const deps = parseConstructorArgs(service) as K[];
		this.nameToFactory.set(name as unknown as K, {
			type: 'sync',
			name: name as unknown as K,
			deps,
			factory: (...args: unknown[]) => {
				return new service(...args)
			}
		})

		return this as unknown as ExtendedContainer<K, M, S, T>;
	}

	test(name: keyof M): boolean {
		const factoryDef = this.nameToFactory.get(name);
		if (factoryDef === undefined) {
			return false;
		}

		for (const dep of factoryDef.deps) {
			const depResult = this.test(dep);
			if (!depResult) {
				return false;
			}
		}

		return true;
	}

	testSync(name: K): boolean {
		const factoryDef = this.nameToFactory.get(name);
		if (factoryDef === undefined) {
			return false;
		}

		if (factoryDef.type === 'async') {
			return false;
		}

		for (const dep of factoryDef.deps) {
			const depResult = this.testSync(dep);
			if (!depResult) {
				return false;
			}
		}

		return true;
	}

	async get<
		const SpecKey extends keyof M,
		const Spec extends { [T in keyof SpecKey]: true }
	>(spec: Spec): Promise<Pick<M, Extract<keyof Spec, keyof M>>> {
		const toReturn: Partial<{[T in SpecKey]: M[T]}> = {};

		const promises: Promise<void>[] = [];
		for (const key of Object.keys(spec)) {
			const requestedService = key as keyof typeof toReturn;
			const getResult = this.rawGet(requestedService as unknown as K, false);
			if (getResult instanceof Promise) {
				promises.push(getResult.then((x: M[SpecKey]): void => {
					toReturn[requestedService] = x;
				}));
			} else {
				toReturn[requestedService] = getResult;
			}
		}

		await Promise.all(promises);
		return toReturn as Pick<M, Extract<keyof Spec, keyof M>>
	}

	getSync<
		const S extends Partial<{ [T in keyof M]: true }>
	>(spec: S): Pick<M, Extract<keyof S, keyof M>> {
		const keys = Object.keys(spec);
		const keyInstances = keys.map((key) => [key, this.rawGet(key as K, true)]);
		return Object.fromEntries(keyInstances);
	}

	private rawGetMany<T extends Extract<K, keyof M>[]>(keys: readonly [...T], requiresSync: true): SyncResolvedInstanceKeyArray<M, T>;
	private rawGetMany<T extends Extract<K, keyof M>[]>(keys: readonly [...T], requiresSync: false): AsyncResolvedInstanceKeyArray<M, T>;
	private rawGetMany<T extends Extract<K, keyof M>[]>(keys: readonly [...T], requiresSync: boolean): ResolvedInstanceKeyArray<M, T> {
		if (requiresSync) {
			return keys.map(x => this.rawGet(x, true)) as SyncResolvedInstanceKeyArray<M, T>;
		} else {
			return normalizeMaybePromises(keys.map(x => this.rawGet(x, false))) as AsyncResolvedInstanceKeyArray<M, T>;
		}
	}

	private rawGet<T extends keyof M>(name: T, requiresSync: true): M[T];
	private rawGet<T extends keyof M>(name: T, requiresSync: false): M[T] | Promise<M[T]>;
	private rawGet<T extends keyof M>(name: T, requiresSync: boolean): M[T] | Promise<M[T]> {
		console.log('rawGet', { name, requiresSync });

		// Check for existing instance
		const instance = this.getInstance(name);
		if (instance !== undefined) {
			return instance;
		}

		// Check for a pending initialization
		const pending = this.getPending(name);
		if (pending !== undefined) {
			if (requiresSync) {
				throw new AsyncInitRequiredError(name);
			}

			return pending;
		}

		// Fetch the factory
		const factoryDef = this.getFactory(name);
		if (factoryDef === undefined) {
			if (this.parent !== undefined) {
				return requiresSync
					? this.parent.rawGet(name, requiresSync)
					: this.parent.rawGet(name, requiresSync);
			} else {
				throw new MissingServiceError(name);
			}
		}

		let deps: unknown[];
		switch (factoryDef.type) {
			case 'sync':
				deps = this.rawGetMany(factoryDef.deps as (Extract<K, keyof M>)[], true);
				const factoryResult = factoryDef.factory(...deps);
				return factoryResult as M[T];
			case 'async':
				if (requiresSync) {
					throw new AsyncInitRequiredError(name);
				}

				const depResult = this.rawGetMany(factoryDef.deps as (Extract<K, keyof M>)[], false);
				if (depResult instanceof Promise) {
					return depResult.then(deps => factoryDef.factory(...deps))
				} else {
					return factoryDef.factory(...depResult);
				}
			case 'service':
				if (requiresSync) {
					throw new AsyncInitRequiredError(name);
				}

				const serviceDepsResult = this.rawGetMany(factoryDef.deps as (Extract<K, keyof M>)[], false);
				if (serviceDepsResult instanceof Promise) {
					return serviceDepsResult.then(deps => new factoryDef.service(...deps));
				} else {
					return new factoryDef.service(...serviceDepsResult);
				}
		}
	}

	// TODO: Setters

	private getInstance<T extends keyof M>(name: T): M[T] | undefined {
		if (!this.nameToInstance.has(name)) {
			return undefined;
		}

		return this.nameToInstance.get(name) as M[T];
	}

	private getPending<T extends keyof M>(name: T): Promise<M[T]> | undefined {
		if (!this.nameToPending.has(name)) {
			return undefined;
		}

		return this.nameToPending.get(name) as Promise<M[T]>;
	}

	private getFactory<T extends keyof M>(name: T): FactoryDefinition<K, M[T]> | undefined {
		if (!this.nameToFactory.has(name)) {
			return undefined;
		}

		return this.nameToFactory.get(name) as FactoryDefinition<K, M[T]>;
	}

}

export class AsyncInitRequiredError extends Error {
	constructor(service: string) {
		super(`The service "${service}" cannot be initialized synchronously`);
	}
}

class MissingServiceError extends Error {
	constructor(private service: string, cause?: MissingServiceError) {
		super(undefined, { cause })
	}

	get message() {
		return `The service '${this.service}' cannot be constructed`;
	}
}

type InstanceKey = string;

type ResolvedInstanceKeyArray<M extends object, K extends (keyof M)[]> = SyncResolvedInstanceKeyArray<M, K> | AsyncResolvedInstanceKeyArray<M, K>;
type SyncResolvedInstanceKeyArray<M extends object, K extends (keyof M)[]> = { [I in keyof K]: M[K[I]] };
type AsyncResolvedInstanceKeyArray<M extends object, K extends (keyof M)[]> = SyncResolvedInstanceKeyArray<M, K> | Promise<SyncResolvedInstanceKeyArray<M, K>>;

type ContainerMapping<K extends InstanceKey> = {
	[T in K]: unknown
};

type ExtendedContainer<K extends InstanceKey, M extends ContainerMapping<K>, T extends InstanceKey, U> = ServiceContainer<K | T, M & {
	[V in T]: U
}>;

type Factory<T> = (...args: unknown[]) => T;

type AsyncFactory<T> = (...args: unknown[]) => Promise<T>;

type Service<T> = new (...args: unknown[]) => T;

type FactoryDefinition<D extends InstanceKey, T> =
	| { type: 'sync', name: D, deps: D[], factory: Factory<T> }
	| { type: 'async', name: D, deps: D[], factory: AsyncFactory<T> }
	| { type: 'service', name: D, deps: D[], service: Service<T> }

