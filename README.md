# Necessity

A library for dependency injection in Node.js.

**NOTE:** This library is currently in active development. It may or may not be
ready for you use case depending on what level of maturity and reliability you
need.

## Getting Started

### Installation

Begin by installing necessity from NPM using your preferred package manager.

```bash
npm install necessity
```

### Simple Example

Once `necessity` has been installed, you will need to define a container to hold
your services. Let's initially create a container that manages a logger for us.
We will use `console` as our logger of choice.

```typescript
import { ServiceContainer } from 'necessity';

const services = new ServiceContainer({
	logger: () => {
		console.log('Initializing logger');
		return console;
	}
});

console.log('Requesting logger');
const logger = await services.get('logger');
logger.log('Received logger');
```

Upon running this code, you should see the following output:

```
Requesting logger
Initializing logger
Received logger
```

In the previous code snippet, we defined a service container and provided a
function which returns an instance of a service identified by the service id
`logger`. We then asked the service container to provide the instance of
`logger` using the `get` method. We can see from the log messages, that the
`logger` was lazily initialized and our function for instantiating the logger
was not called until after we requested the logger via the `get` method. 

### Requiring Dependencies

The `necessity` library provides more functionality that merely getting a single
service instance. Let's update our code with a more complex example that has
interconnected services:

```typescript
import { ServiceContainer } from 'necessity';

const services = new ServiceContainer({
	logger: () => {
		console.log('Initializing logger');
		return console;
	},
	numberRepo: (logger: typeof console) => {
		logger.log('Initializing repo');

		let numbers: number[] = [];

		return {
			add(x: number): void {
				logger.log('numberRepo.add: ' + x);
				numbers.push(x);
			}

			get(index: number): number {
				logger.log('numberRepo.get: ' + index);
				return numbers[index];
			}
		}
	},
});

const repo = await services.get('numberRepo');
repo.add(1);
repo.add(2);
repo.add(3);
const x = repo.get(1);

const logger = await services.get('logger');
logger.info('Retrieved number from repo: ' + x);
```

In the example, we can see that the `numberRepo` requires the `logger` that also
exists in the same `ServiceContainer`. This dependency is expressed, by having a
parameter in the factory function which matches the name of the service being
requested. In `necessity`, all parameter names, are interpreted as service IDs
for another service in the service container. When the `numberRepo` is requested
from the service container with the code `services.get('numberRepo')`, the
`logger` factory function is first called, and the result is saved within the
`ServiceContainer` to pass to `numberRepo`'s factory function.

If the parameter name in a factory function does not match any service that has
been registered with the `ServiceContainer`, an error is thrown when the factory
function is invoked when calling the relevant `get` method.

### Parent Container

The `ServiceContainer` class is designed such that they can be composed in a
hierarchy. This is accomplished by allowing a parent to be specified when
constructing a `ServiceContainer`. When a `ServiceContainer` has a parent, it
will also check the parent for the definition of a service if it did not find a
definition for that service in itself.

The following is a simple example that uses both parent, and child services:

```typescript
const parentServices = new ServiceContainer({
	logger: () => {
		return console
	}
});

const childServices = new ServiceContainer({
	repo: (logger: typeof console) => {
		const data: string[] = [];
		return {
			insert(value: string) {
				logger.info('insert');
				data.push(value);
			}
			get() {
				logger.info('get');
				return data;
			}
		}
	},
})
```

A practical use of this feature can be in a web app framework where there are a
set of "Application Services" which exist for the duration of the application
and a set of "Request Services" which exist once per request being handled.

### Refiner

The `ServiceContainer` class also has a concept of "refining", this allows for
creating a new instance of a service from an existing instance in a parent
`ServiceContainer`. This is useful for managing parent-child relationships
between othter libraries such as logging libraries. The following example shows
managing the creation of child loggers using the `pino` library.

```typescript
import createLogger from 'pino';

const parentServices = new ServiceContainer({
	logger: () => createLogger()
});

const childServices = parentServices.child({})
	.refineService('logger', logger => logger.child({
		myAttribute: 'myValue'
	}));

const childLogger = await childServices.get('logger');
childLogger.info('Message');
```

### Destructor

In addition to creating services, `necessity` also supports properly closing
resources. This is accomplished by defining a "destructor" alongside the factory
function. This allows a single call to `ServiceContainer.close()` which will
then call all defined destructors, in the appropriate order.

```typescript
const services = new ServiceContainer({
	logger: {
		service: () => {
			console.log('Creating logger');
		},
		destructor: logger => {
			logger.log('Destroying logger');
		}
	}
});

const logger = await services.get('logger');
logger.log('Log message');
await services.close();

// Output:
// Creating logger
// Log message
// Destroying logger
```

