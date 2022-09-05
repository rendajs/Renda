/**
 * Recursively traverses down the taskConfig object and replaces variables
 * of any string within the object with the value of that variable.
 * Variables are indicated using a dollar sign ($) followed by the name of the variable.
 *
 * For example, the following object:
 * ```js
 * {
 * 	foo: { bar: "$VAR1"},
 * 	baz: "(this text is not replaced) $VAR2 (and neither is this)",
 * }
 * ```
 * With the following environment variables:
 * ```js
 * {
 * 	VAR1: "hello",
 * 	VAR2: "world",
 * }
 * ```
 * Will modify the object to be
 * ```js
 * {
 * 	foo: { bar: "hello"},
 * 	baz: "(this text is not replaced) world (and neither is this)",
 * }
 * ```
 * The object is modified in place rather than being cloned.
 * Circular references are not accounted for.
 * @param {any} taskConfig
 * @param {Object<string, string>} environmentVariables
 */
export function fillEnvironmentVariables(taskConfig, environmentVariables) {
	if (taskConfig == null) return null;
	if (typeof taskConfig == "object") {
		if (Array.isArray(taskConfig)) {
			for (const [i, entry] of taskConfig.entries()) {
				if (typeof entry == "string") {
					taskConfig[i] = fillEnvironmentVariablesString(entry, environmentVariables);
				} else {
					fillEnvironmentVariables(entry, environmentVariables);
				}
			}
		} else {
			for (const [key, value] of Object.entries(taskConfig)) {
				if (typeof value == "string") {
					taskConfig[key] = fillEnvironmentVariablesString(value, environmentVariables);
				} else {
					fillEnvironmentVariables(value, environmentVariables);
				}
			}
		}
	} else if (typeof taskConfig == "string") {
		throw new Error("Applying environment variables to configs that are a single string is not supported.");
	}
}

/**
 * @param {string} str
 * @param {Object<string, string>} environmentVariables
 */
function fillEnvironmentVariablesString(str, environmentVariables) {
	for (const [name, value] of Object.entries(environmentVariables)) {
		str = str.replaceAll("$" + name, value);
	}
	return str;
}
