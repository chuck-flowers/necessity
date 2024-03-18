const CTOR_REGEX = /constructor\(([^)]*)\)/

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseConstructorArgs<T>(input: new (...args: any[]) => T): string[] {
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
