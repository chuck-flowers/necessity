import { ServiceContainer } from 'baster';

export const global = new ServiceContainer();

export function getRequestServices(_context: {}): ServiceContainer {
	const services = new ServiceContainer();

	return services;
}

