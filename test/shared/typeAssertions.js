/**
 * These is a helper function for verifying types. You can use them to verify
 * return types from functions with generics.
 *
 * For example, say you want to test if a variable is a string and nothing else:
 *
 * ```js
 * const isString = "my string";
 * ```
 *
 * You can then verify the return type like so:
 *
 * ```js
 * // Verify that the variable is a string and nothing else
 * assertIsType("", isString);
 * ```
 * This works, because passing `""` as first argument lets the function know you're
 * expecting a boolean. The second argument then *has* to also be a string, otherwise
 * a type error is emitted.
 * For instance, if you pass in something with the type `string | null`, you'd get a type
 * error:
 * ```js
 * const isMaybeString = true ? null : "";
 * assertIsType("", isMaybeString);
 * ```
 *
 *
 * Keep in mind though, that you'd probably also want to do a second check to verify
 * that the variable or function doesn't have `any` as type:
 *
 * ```js
 * // @ts-expect-error Verify that the variable isn't 'any'
 * assertIsType(true, isString);
 * ```
 *
 * This works, because passing `true` as first argument lets the function know
 * you're expecting a boolean. Since `isString` is a string, this
 * causes a type error, which we catch using `@ts-expect-error`. If `isString`
 * was 'any', we would not get any type errors, but this would cause `@ts-expect-error`
 * to not catch anything and emit a type error instead.
 *
 * Of course these are some pretty basic examples, and there's no need to write
 * tests for every return type of every function. This is mostly useful for functions
 * with complex generics depending on their input arguments.
 *
 * Note that in TypeScript you can get away with a more basic version of this
 * function, which only needs a single argument:
 * ```ts
 * function assertIsType<T>(t: T) {}
 * ```
 * But since we're using JavaScript with JSDoc comments, it is not possible to
 * call this function without inferring types. Making it useless in tests.
 *
 * @template T
 * @template {T} U
 * @param {T} expectedType
 * @param {U} actualType
 */
export function assertIsType(expectedType, actualType) {}
