/**
 * Computes the size of an element including the borders, margin and padding.
 * @param {HTMLElement} el
 * @return {[width: number, height: number]}
 */
export function getElementSize(el) {
	let w = el.offsetWidth;
	let h = el.offsetHeight;
	const style = window.getComputedStyle(el);

	const styleNames = ["margin", "border", "padding"];
	for (const styleName of styleNames) {
		const styleNames2 = [`${styleName}-left`, `${styleName}-right`];
		for (const styleName2 of styleNames2) {
			const value = style.getPropertyValue(styleName2);
			if (value) {
				w += parseInt(value, 10);
			}
		}
		const styleNames3 = [`${styleName}-top`, `${styleName}-bottom`];
		for (const styleName3 of styleNames3) {
			const value = style.getPropertyValue(styleName3);
			if (value) {
				h += parseInt(value, 10);
			}
		}
	}
	return [w, h];
}

/**
 * @typedef {object} ParsedMimeType
 * @property {string} type
 * @property {string} subType
 * @property {Object<string, string>} parameters
 */

/**
 * @param {string} mimeType
 * @returns {ParsedMimeType?}
 */
export function parseMimeType(mimeType) {
	const split = mimeType.split("/");
	if (split.length < 2) return null;
	const [type, subTypeWithParams] = split;
	const paramsSplit = subTypeWithParams.split(";");
	const [subType, ...paramsStr] = paramsSplit;
	/** @type {Object<string, string>} */
	const params = {};
	for (const [name, value] of paramsStr.map(p => p.trim().split("="))) {
		params[name.toLowerCase()] = value;
	}
	return {type, subType, parameters: params};
}

/**
 * Utility function for creating new files while making sure there are no
 * name clashes.
 *
 * ## Usage
 *
 * ### Basic
 * ```js
 * for (let i = 0; i < 3; i++) {
 *   handleDuplicateFileName(["existingFile.txt"], "myNewFile", ".txt", "-")
 * }
 * ```
 * Will result in `myNewFile.txt`, `myNewFile 1.txt`, `myNewFile 2.txt`.
 *
 * ### Using numberPrefix
 * ```js
 * for (let i = 0; i < 3; i++) {
 *   handleDuplicateFileName(["existingFile.txt"], "myNewFile", ".txt", "-")
 * }
 * ```
 * Will result in `myNewFile.txt`, `myNewFile-1.txt`, `myNewFile-2.txt`.
 *
 * ### Using a read directory result
 * ```js
 * const existingFiles = await myFileSystem.readDir(["some", "path"]);
 * handleDuplicateFileName(existingFiles, "myNewFile", ".txt")
 * ```
 * @param {import("./fileSystems/StudioFileSystem.js").StudioFileSystemReadDirResult | string[]} existingNames
 * @param {string} prefix The text that you want the name of the file to start with. This is usually the name of the file.
 * @param {string} suffix The text that you want the name of the file to end with. This is usually the extension of the file.
 * @param {string} numberPrefix In case a number is inserted, this text will be inserted before the number.
 */
export function handleDuplicateFileName(existingNames, prefix, suffix = "", numberPrefix = " ") {
	if (!Array.isArray(existingNames) && typeof existingNames == "object" && existingNames.files && existingNames.directories) {
		existingNames = [...existingNames.files, ...existingNames.directories];
	}
	const castExistingNames = /** @type {string[]} */ (existingNames);
	if (!castExistingNames.includes(prefix + suffix)) return prefix + suffix;
	let i = 0;
	while (true) {
		i++;
		const newName = prefix + numberPrefix + i + suffix;
		if (!castExistingNames.includes(newName)) return newName;
	}
}

/**
 * Converts variables from camel case to title case.
 *
 * ## Usage
 * ```js
 * prettifyVariableName("myCoolVariable") // "My Cool Variable"
 * ```
 * @param {string | undefined | null} variableName
 */
export function prettifyVariableName(variableName) {
	if (!variableName) return "";
	variableName = String(variableName);
	let words = variableName.split(/(?<=[a-z])(?=[A-Z\s]+)/);
	words = words.map(word => word.trim());
	const capitalizedWords = words.map(w => {
		if (w && w.length != 0) {
			return w[0].toUpperCase() + w.slice(1).toLowerCase();
		} else {
			return w;
		}
	});
	return capitalizedWords.join(" ");
}
