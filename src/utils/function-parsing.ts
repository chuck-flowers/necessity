const FUNCTION_REGEX = /(function)?\s*\(([^\)]*)\)/;

export function parseFunctionArgs<T>(input: (...args: any[]) => T): string[] {
	const funcStr = input.toString();
	const match = FUNCTION_REGEX.exec(funcStr);
	if (match === null) {
		return [];
	}

	const [_, _keyword, params] = match;

	const toReturn: string[] = [];
	for (const p of params.split(',')) {
		if (p !== '') {
			toReturn.push(p.trim());
		}
	}

	return toReturn;
}

