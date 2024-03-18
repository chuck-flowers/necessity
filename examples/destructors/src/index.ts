import { ServiceContainer } from 'necessity';

class Services extends ServiceContainer {
	constructor() {
		super();

		this.defineFactory('config', () => {
			return {
				user: 'admin',
				pass: 'admin123',
			};
		}, {
			destructor: () => console.log('config dtor (last dtor)')
		});

		this.defineFactory('personRepo', (config: { user: string, pass: string }) => {
			return [{ user: config.user, pass: config.pass }];
		}, {
			destructor: () => console.log('personRepo dtor (before config dtor)')
		});

		this.defineFactory('unused', () => {
			return null;
		}, {
			destructor: () => console.log('unused dtor (never called)')
		});
	}
}

const services = new Services();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const personRepo = await services.get<{ user: string, pass: string }[]>('personRepo');

services.close();

