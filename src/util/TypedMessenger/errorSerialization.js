/**
 * @param {unknown} error
 */
export function serializeErrorHook(error) {
	return errorSerializationHelper(error, [aggregateErrorSerialization, baseErrorSerialization]);
}

/**
 * @param {unknown} error
 */
export function deserializeErrorHook(error) {
	return errorSerializationHelper(error, [aggregateErrorDeserialization, baseErrorDeserialization]);
}

/**
 * @typedef SerializedBaseError
 * @property {"base"} type
 * @property {string} message
 * @property {string?} stack
 */

/**
 * @param {unknown} error
 * @param {SerializationHelperContext} context
 * @returns {SerializedBaseError | undefined}
 */
export function baseErrorSerialization(error, context) {
	if (error instanceof Error) {
		return {
			type: "base",
			message: error.message,
			stack: error.stack || null,
		};
	}
}

/**
 * @param {unknown} error
 */
export function baseErrorDeserialization(error) {
	if (error && typeof error == "object" && "type" in error && error.type == "base") {
		const castError = /** @type {SerializedBaseError} */ (error);
		const errorInstance = new Error(castError.message);
		if (castError.stack) errorInstance.stack = castError.stack;
		return errorInstance;
	}
}

/**
 * @typedef SerializedAggregateError
 * @property {"aggregate"} type
 * @property {unknown[]} errors
 * @property {string} message
 * @property {string?} stack
 */

/**
 * @param {unknown} error
 * @param {SerializationHelperContext} context
 * @returns {SerializedAggregateError | undefined}
 */
export function aggregateErrorSerialization(error, context) {
	if (error instanceof AggregateError) {
		const serializedErrors = [];
		for (const e of error.errors) {
			serializedErrors.push(errorSerializationHelper(e, context.hooks));
		}
		return {
			type: "aggregate",
			message: error.message,
			stack: error.stack || null,
			errors: serializedErrors,
		};
	}
}

/**
 * @param {unknown} error
 * @param {SerializationHelperContext} context
 */
export function aggregateErrorDeserialization(error, context) {
	if (error && typeof error == "object" && "type" in error && error.type == "aggregate") {
		const castError = /** @type {SerializedAggregateError} */ (error);
		const errors = [];
		for (const e of castError.errors) {
			errors.push(errorSerializationHelper(e, context.hooks));
		}
		const errorInstance = new AggregateError(errors, castError.message);
		if (castError.stack) errorInstance.stack = castError.stack;
		return errorInstance;
	}
}

/**
 * @template {unknown[]} TReturn
 * @typedef {{ [K in keyof TReturn]: (error: unknown, context: SerializationHelperContext) => TReturn[K] }} SerializationHelperHooks
 */

/**
 * @typedef SerializationHelperContext
 * @property {SerializationHelperHooks<any>} hooks
 */

/**
 * @template {unknown[]} TReturn
 * @param {unknown} error
 * @param {SerializationHelperHooks<TReturn>} hooks
 * @returns {TReturn[number]}
 */
export function errorSerializationHelper(error, hooks) {
	for (const hook of hooks) {
		const result = hook(error, {hooks});
		if (result) return result;
	}
}
