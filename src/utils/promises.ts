export type MaybePromise<T> = T | Promise<T>;

export function normalizeMaybePromises<T>(input: MaybePromise<T>[]): MaybePromise<T[]> {
	const toReturn: T[] = [];
	const promises: Promise<void>[] = [];
	let index = 0;


	while (index < input.length) {
		const curr = input[index];

		if (curr instanceof Promise) {
			const frozenIndex = index;
			promises.push(curr.then(x => {
				toReturn[frozenIndex] = x;
			}));
		} else {
			toReturn[index] = curr;
		}

		index++;
	}

	if (promises.length <= 0) {
		return toReturn;
	} else {
		return Promise.allSettled(promises).then((results) => {
			const errors: unknown[] = [];
			for (const x of results) {
				if (x.status === 'rejected') {
					errors.push(x.reason);
				}
			}

			if (errors.length <= 0) {
				return toReturn;
			} else {
				throw new Error('Failed to resolve all promises', {
					cause: errors
				});
			}
		})
	}
}
