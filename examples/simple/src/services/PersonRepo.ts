import Person from '../models/Person.js';
import { global } from '../services.js';
import { ILogger } from './Logger.js';

export interface IPersonRepo {
	insert(p: Person): void;
	all(): Person[];
	deleteAll(): void;
}

@global.register
export default class PersonRepo implements IPersonRepo {
	private readonly people: Person[] = [];

	constructor(
		private logger: ILogger
	) {

	}

	insert(p: Person) {
		this.logger.debug('insert', { p });
		this.people.push(p);
	}

	all(): Person[] {
		this.logger.debug('all');
		return this.people;
	}

	deleteAll(): void {
		this.logger.debug('deleteAll');
		while (this.people.pop());
	}
}

