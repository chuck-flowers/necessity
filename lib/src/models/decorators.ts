export type ClassDec<T> = (value: DecoratedClass<T>, context: ClassDecContext) => void;
export type DecoratedClass<T> = new (...args: unknown[]) => T;
export type ClassDecContext = {
	kind: 'class',
	name: string | undefined
}

