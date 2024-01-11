const CTOR_REGEX = /constructor\(([^)]*)\)/

export function parseConstructorArgs<T>(input: new (...args: unknown[]) => T): string[] {
	const classStr = input.toString();
	const match = CTOR_REGEX.exec(classStr);
	if (match === null) {
		return [];
	}

	const [, params] = match;

	const toReturn: string[] = [];

	for (const p of params.split(',')) {
		const param = p.trim();

		if (param !== "") {
			toReturn.push(param);
		}
	}

	return toReturn;
}
