import Person from '../models/Person';
import { global } from '../services';
import { ILogger } from './Logger';

export interface IPersonRepo {
	insert(p: Person): void;
	all(): Person[];
	deleteAll(): void;
}

@global
export default class PersonRepo implements IPersonRepo {
	private readonly people: Person[] = [];

	constructor(
		private logger: ILogger
	) {

	}

	insert(p: Person) {
		this.logger.debug('insert', { p });
		this.people.push();
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
