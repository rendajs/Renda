// @ts-nocheck
/**
 * This is useful for working around TypeScript errors when using StudioDefines.
 * For instance, wraping a `throw` inside `DEBUG_INCLUDE_ERROR_THROWS` will
 * cause TypeScript to think that the function may not actually throw.
 * However, this variable is specifically used for stripping code that is
 * expected to cause the application to fail elsewhere. So in this case we
 * want TypeScript to act as if the variable is always true.
 *
 * For example:
 *
 * ```js
 * function stringOrThrow(shouldThrow) {
 * 	if (shouldThrow) {
 * 		if (DEBUG_INCLUDE_ERROR_THROWS) {
 * 			throw new Error("oh no");
 * 		}
 * 	} else {
 * 		return "a string";
 * 	}
 * }
 * ```
 *
 * Will cause the return type to be `string | undefined`. Causing us to have
 * to check for undefined everywhere, even though we know that it will always
 * contain a string, and if not we want the application to fail by itself.
 * So to fix this, we can do:
 *
 * ```js
 * function stringOrThrow(shouldThrow) {
 * 	if (shouldThrow) {
 * 		if (DEBUG_INCLUDE_ERROR_THROWS) {
 * 			throw new Error("oh no");
 * 		} else {
 * 			neverNoOp();
 * 		}
 * 	} else {
 * 		return "a string";
 * 	}
 * }
 * ```
 *
 * This will replace `undefined` with `never`, causing the return type to
 * collapse to just `string`.
 *
 * Alternatively, if you have a class, of which you want to strip the contents
 * entirely by using a certain engine define, you can do:
 *
 * ```js
 * class Foo {
 * 	constructor() {
 * 		if (!FOO_ENABLED) return;
 *
 * 		this.someString = "hello";
 * 	}
 *
 * 	useString() {
 * 		this.someString.toUpperCase();
 * 	}
 * }
 * ```
 * But similarly, this will cause `this.someString` to be `string | undefined`.
 *
 * You can fix this like so:
 * ```js
 *
 * class Foo {
 * 	constructor() {
 * 		if (!ENABLE_INSPECTOR_SUPPORT) {
 * 			neverNoOp();
 * 			return;
 * 		}
 *
 * 		this.someString = "hello";
 * 	}
 *
 * 	useString() {
 * 		this.someString.toUpperCase();
 * 	}
 * }
 * ```
 *
 * Now the return statement in the constructor is marked as unreachable code,
 * and `this.someString` will be definitely defined.
 * @returns {never}
 */
export function neverNoOp() {}
