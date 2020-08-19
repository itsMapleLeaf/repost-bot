export function raise(errorMessage: string) {
	throw new Error(errorMessage)
}

type Falsy = undefined | null | false | "" | 0 | void

export function isTruthy<T>(value: T): value is Exclude<T, Falsy> {
	return Boolean(value)
}
