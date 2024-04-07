/**
 * @param {string} definesFilePath
 * @param {Object<string, unknown>} defines
 * @returns {import("rollup").Plugin}
 */
export function overrideDefines(definesFilePath, defines) {
	return {
		name: "studio-replace-defines",
		transform(code, id) {
			if (id.endsWith(definesFilePath)) {
				for (const [name, value] of Object.entries(defines)) {
					const re = new RegExp(name + "\\s?=.+;?$", "gm");
					code = code.replace(re, `${name} = ${JSON.stringify(value)};`);
				}
				return code;
			}
			return null;
		},
	};
}
