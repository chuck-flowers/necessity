import { EditPerson, NewPerson, Person } from "../models/person.js";
import { ILogger } from "./Logger.js";

export type IRepo = Pick<Repo, keyof Repo>;
export default class Repo implements IRepo {
	private map = new Map<number, Person>();
	private nextId = 1;

	constructor(
		private readonly logger: ILogger
	) {

	}

	create(p: NewPerson): void {
		this.logger.debug('create', { p });

		const toInsert = { id: this.nextId++, ...p };
		this.map.set(toInsert.id, toInsert);
	}

	getAll(): Person[] {
		this.logger.debug('getAll');

		return Array.from(this.map.values());
	}

	get(id: number) {
		this.logger.debug('get', { id });

		return this.map.get(id);
	}

	update(id: number, patch: EditPerson): boolean {
		this.logger.debug('update', { id, patch });

		const existing = this.map.get(id);
		if (existing === undefined) {
			return false;
		}

		this.map.set(id, { ...existing, ...patch });
		return true;
	}

	delete(id: number): boolean {
		this.logger.debug('delete', { id });

		return this.map.delete(id);
	}
}

