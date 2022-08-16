/**
 * Creates a helper function that you can use for asserting if a value is of a certain type.
 * The created function also asserts that the value is not 'any'.
 * This is done using the second parameter, you pass the same parameter twice, and
 * if the first parameter is 'any' the second parameter will cause a type error.
 *
 * ### Example usage
 * ```js
 * // @\type {CreateTypeAssertionFn<number>}
 * const assertNumber = () => {};
 *
 * const returnValue1 = returnsNumber();
 * assertNumber(returnValue1, returnValue1); // ok
 *
 * const returnValue2 = returnsString();
 * assertNumber(returnValue2, returnValue2); // causes a type error
 *
 * const returnValue3 = returnsAny();
 * assertNumber(returnValue3, returnValue3); // causes a type error
 * ```
 */
type CreateTypeAssertionFn<T> = <T2>(arg1: T2, arg2: (0 extends (1 & T2) ? never : T)) => void
