import { ServiceContainer } from 'baster';

const globalServices = new ServiceContainer();
export const global = globalServices.makeRegistrar();

export function getGlobalServices(): ServiceContainer {
	return globalServices;
}

export function getRequestServices(_context: {}): ServiceContainer {
	const services = new ServiceContainer();

	return services;
}

