import express, {ErrorRequestHandler} from 'express';
import mustacheExpress from 'mustache-express';
import { ServiceContainer } from 'necessity/dist/ServiceContainer.js';
import Logger from './services/Logger.js';
import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value'
import { editPerson, newPerson } from './models/person.js';
import Repo from './services/Repo.js';

const app = express();

app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');

app.use(express.json());
app.use(express.urlencoded());

const services = new ServiceContainer({
	logger: Logger,
	repo: Repo
});

const logger = await services.get('logger');
logger.info('Initializing API...');

app.get('/', async (req, res, next) => {
	try {
		const repo = await services.get('repo');

		res.render('index', { people: repo.getAll() });
	} catch (reason) {
		next(reason);
	}
});

app.post('/', async (req, res, next) => {
	try {
		const p = Value.Decode(Type.Object({
			firstName: newPerson.properties.firstName,
			lastName: newPerson.properties.lastName,
			age: Type.Transform(Type.String())
				.Decode(x => Number.parseInt(x))
				.Encode(x => x.toString())
		}), req.body);

		const repo = await services.get('repo');
		repo.create(p);

		res.redirect('/');
	} catch (reason) {
		next(reason);
	}
});

app.post('/people', async (req, res, next) => {
	try {
		const p = Value.Decode(newPerson, req.body);
		const repo = await services.get('repo');
		repo.create(p);

		res.status(200).send();
	} catch (reason) {
		next(reason);
	}
});

app.get('/people', async (_req, res, next) => {
	try	{
		const repo = await services.get('repo');
		res.status(200).send(repo.getAll());
	} catch (reason) {
		next(reason);
	}
});

app.get('/people/:id', async (req, res, next) => {
	try { 
		const params = Value.Decode(Type.Object({
			id: Type.Transform(Type.String())
				.Decode(x => Number.parseInt(x))
				.Encode(x => x.toString())
		}), req.params);

		const repo = await services.get('repo');
		const p = repo.get(params.id);

		res.status(200).send(p);
	} catch (reason) {
		next(reason);
	}
});

app.put('/people/:id', async (req, res, next) => {
	try {
		const params = Value.Decode(Type.Object({
			id: Type.Transform(Type.String())
				.Decode(x => Number.parseInt(x))
				.Encode(x => x.toString())
		}), req.params);

		const patch = Value.Decode(editPerson, req.body);

		const repo = await services.get('repo');
		const p = repo.update(params.id, patch);

		return res.status(200).send(p);
	} catch (reason) {
		next(reason);
	}
});

app.use(((err, _req, res, _next) => {
	if (err instanceof Error) {
		logger.error(err as unknown as string);
	} else {
		logger.error(err.toString());
	}

	res.status(500).send('Error');
}) satisfies ErrorRequestHandler);

app.listen(8080, async () => {
	logger.info('Listening on port 8080');
});

