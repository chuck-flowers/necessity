import Logger, { ILogger } from './services/Logger';
import PersonRepo, { IPersonRepo } from './services/PersonRepo';
import { getGlobalServices } from './services';

const container = getGlobalServices();

const logger: ILogger = container.get(Logger);
const personRepo: IPersonRepo = container.get(PersonRepo);

personRepo.insert({ name: 'John', age: 25 });
personRepo.insert({ name: 'Jane', age: 20 });

const people = personRepo.all();
logger.info('people = ', people);

personRepo.deleteAll();

