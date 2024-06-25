/** A function with the format "function () {}" */
const ANON_FUNCTION = /function\s*\(([^)]*)\)/;

/** A function with the format "function name() {}" */
const NAMED_FUNCTION = /function\s+([^\s(]+)\s*\(([^)]*)\)/

/** A function with the format "() => {}" */
const PAREN_ARROW = /\(([^)]*)\)\s*=>/

/** A function with the format "arg => {}" */
const SINGLE_ARG_ARROW = /([^\s]+)\s*=>/;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseFunctionArgs<T>(input: (...args: any[]) => T): string[] {
	const funcStr = input.toString();

	const anonFunctionResult = ANON_FUNCTION.exec(funcStr);
	if (anonFunctionResult !== null) {
		const params = anonFunctionResult[1];
		return parseParamString(params);
	}

	const nameFunctionResult = NAMED_FUNCTION.exec(funcStr);
	if (nameFunctionResult !== null) {
		const params = nameFunctionResult[2];
		return parseParamString(params);
	}

	const parenArrowResult = PAREN_ARROW.exec(funcStr);
	if (parenArrowResult !== null) {
		const params = parenArrowResult[1];
		return parseParamString(params);
	}

	const singleArgResult = SINGLE_ARG_ARROW.exec(funcStr);
	if (singleArgResult !== null) {
		const params = singleArgResult[1];
		return parseParamString(params);
	}

	return [];
}

function parseParamString(params: string): string[] {
	const toReturn = [];

	for (const p of params.split(',')) {
		if (p !== '') {
			toReturn.push(p.trim());
		}
	}

	return toReturn;
}

