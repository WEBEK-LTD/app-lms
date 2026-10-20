/** 56 The shape a translation of an English catalog (`as const`) has: the same keys, each a string. */
export type Strings<T> = { [K in keyof T]: T[K] extends string ? string : Strings<T[K]> };
