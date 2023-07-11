export type ClassDec<T> = (value: DecoratedClass<T>, context: ClassDecContext) => void;
export type DecoratedClass<T> = new (...args: any[]) => T;
export type ClassDecContext = {
	kind: 'class',
	name: string
}

