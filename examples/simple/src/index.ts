import Logger, { ILogger } from './services/Logger.js';
import PersonRepo, { IPersonRepo } from './services/PersonRepo.js';
import { global } from './services.js';

const container = global;

const logger: ILogger = container.get(Logger);
const personRepo: IPersonRepo = container.get(PersonRepo);

personRepo.insert({ name: 'John', age: 25 });
personRepo.insert({ name: 'Jane', age: 20 });

const people = personRepo.all();
logger.info('people = ', people);

personRepo.deleteAll();

