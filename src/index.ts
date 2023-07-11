import { ClassDec } from './models/decorators.js';
import CtorParser from './services/CtorParser.js';

export class ServiceContainer {
	private readonly nameToFactory: Map<string, () => any> = new Map();

	private readonly nameToInstance: Map<string, any> = new Map();

	private readonly ctorToName: Map<new (...args: any[]) => any, string> = new Map();

	private ctorParser = new CtorParser();

	constructor(private parent?: ServiceContainer) { }

	get<T>(nameOrCtor: string | (new (...args: any) => T)): T {
		// Resolve the name if ctor was provided
		if (typeof nameOrCtor !== 'string') {
			const name = this.ctorToName.get(nameOrCtor);
			if (name === undefined) {
				throw new Error(`The service '${nameOrCtor.name}' has not been defined`);
			}

			return this.getService(name);
		}

	}

	defineService<T>(name: string, ctor: new (...args: any[]) => T, dependencies: string[]): void {
		this.ctorToName.set(ctor, name);
		this.nameToFactory.set(name, (): T => {
			const args: any[] = [];
			for (const dep of dependencies) {
				args.push(this.getService(dep));
			}

			return new ctor(...args);
		});
	}

	makeRegistrar(): ClassDec<any> {
		return (value, context) => {
			const serviceId = this.makeServiceId(context.name);
			const dependencies = this.ctorParser.parseCtor(value);

			this.defineService(serviceId, value as unknown as (new (...args: any[]) => any), dependencies);
		}
	}

	private makeServiceId(name: string) {
		return name.charAt(0).toLowerCase() + name.slice(1);
	}

	private getService<T>(name: string): T {
		let instance = this.nameToInstance.get(name);

		// Create the instance
		if (instance === undefined) {
			const ctor = this.nameToFactory.get(name);
			if (ctor === undefined) {
				if (this.parent !== undefined) {
					return this.parent.getService<T>(name);
				} else {
					throw new Error(`The service with id '${name}' has not been defined`);
				}
			}

			instance = ctor();
			this.nameToInstance.set(name, instance);
		}

		return instance;
	}
}

