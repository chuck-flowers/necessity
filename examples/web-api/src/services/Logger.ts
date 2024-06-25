export type ILogger = Pick<Logger, keyof Logger>;
export default class Logger implements ILogger {
	constructor() {
		
	}

	error(msg: string, ...extras: unknown[]) {
		console.error(msg, ...extras);
	}

	warn(msg: string, ...extras: unknown[]) {
		console.warn(msg, ...extras);
	}

	info(msg: string, ...extras: unknown[]) {
		console.info(msg, ...extras);
	}

	debug(msg: string, ...extras: unknown[]) {
		console.debug(msg, ...extras);
	}
}
