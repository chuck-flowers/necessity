import { global } from '../services';

export interface ILogger {
	error(msg: string, ...extras: any[]): void;
	warn(msg: string, ...extras: any[]): void;
	info(msg: string, ...extras: any[]): void;
	debug(msg: string, ...extras: any[]): void;
}

@global
export default class Logger implements ILogger {
	error(msg: string, ...extras: any[]) {
		this.doLog('error', msg, ...extras)
	}

	warn(msg: string, ...extras: any[]) {
		this.doLog('warn', msg, ...extras)
	}

	info(msg: string, ...extras: any[]) {
		this.doLog('info', msg, ...extras)
	}

	debug(msg: string, ...extras: any[]) {
		this.doLog('debug', msg, ...extras)
	}

	private doLog(level: 'error' | 'warn' | 'info' | 'debug', msg: string, ...extras: any[]) {
		console[level](msg, Object.assign({}, ...extras));
	}
}

