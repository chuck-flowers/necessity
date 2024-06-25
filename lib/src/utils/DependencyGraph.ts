export default class DependencyGraph {
	private readonly mapping = new Map<string, string[]>();

	defineDep(service: string, dependsOn: string) {
		let dependencies = this.mapping.get(service);
		if (dependencies === undefined) {
			dependencies = [];
			this.mapping.set(service, dependencies);
		}

		dependencies.push(dependsOn);
	}

	invert(): DependencyGraph {
		const toReturn = new DependencyGraph();

		for (const [service, deps] of this.mapping.entries()) {
			for (const dep of deps) {
				toReturn.defineDep(dep, service);
			}
		}

		return toReturn;
	}

	allServices(): Set<string> {
		const set = new Set<string>();

		for (const [key, values] of this.mapping.entries()) {
			set.add(key);
			for (const v of values) {
				set.add(v);
			}
		}

		return set;
	}

	*topologicalSort(): Iterable<string> {
		const set = new Set<string>();
		for (const x of this.mapping.keys()) {
			for (const y of this.getTransitiveDependencies(x)) {
				if (!set.has(y)) {
					set.add(y);
					yield y;
				}
			}
		}
	}

	*getTransitiveDependencies(input: string): Iterable<string> {
		const values = this.mapping.get(input);
		if (values !== undefined && values.length > 0) {
			for (const v of values) {
				yield* this.getTransitiveDependencies(v);
			}
		}

		yield input;
	}
}

