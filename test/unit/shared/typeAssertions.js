/**
 * These is a helper function for verifying types. You can use them to verify
 * return types from functions with generics.
 *
 * This function checks if the second parameter 'fits' inside the first parameter.
 *
 * ## Basic Usage
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
 * // Verify that the type is a string and nothing else
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
 * ## Working with unions
 *
 * If you are working with unions, you need a few more checks.
 * For instance, say you want to verify if a type is `"yes" | "no"` you could do
 * ```js
 * const yesOrNo = true ? "yes" : "no";
 * assertIsType(yesOrNo, typeYouWishToCheck);
 * ```
 * But it is entirely possible that `typeYouWishToCheck` has the type `"yes"`, without any `"no"`.
 * To handle this, you can flip the two arguments around and check for each type
 * of the union that you want it to contain:
 * ```js
 * const yesOrNo = true ? "yes" : "no";
 * assertIsType(yesOrNo, typeYouWishToCheck);
 * assertIsType(typeYouWishToCheck, "yes");
 * assertIsType(typeYouWishToCheck, "no");
 * ```
 * But keep in mind to also perform your first check, otherwise `typeYouWishToCheck` might contain
 * extra types in its union that you don't want.
 *
 * ## Checking for `any`
 *
 * Whenever you use this, you'd probably also want to do another check to verify
 * that the variable or function doesn't have `any` as type. Otherwise all of
 * the assertions you make will pass regardless of the types you are checking for.
 *
 * ```js
 * // @ts-expect-error Verify that the type isn't 'any'
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

/**
 * This function does absolutely nothing. It is never run.
 * It's only purpose is to make tests look nice without the linter complaining about unreachable code.
 * The `fn` parameter can be used to write code that will never be run, but still gets type checked.
 * @param {object} options
 * @param {string} options.name
 * @param {() => void | Promise<void>} options.fn
 */
export function testTypes({name, fn}) {}
