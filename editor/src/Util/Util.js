export function getElemSize(el) {
	let w = el.offsetWidth;
	let h = el.offsetHeight;
	const style = window.getComputedStyle(el);

	w = ["margin-left", "margin-right", "border-left", "border-right", "padding-left", "padding-right"]
		.map(k => parseInt(style.getPropertyValue(k), 10))
		.reduce((prev, cur) => prev + cur, w);
	h = ["margin-top", "margin-bottom", "border-top", "border-bottom", "padding-top", "padding-bottom"]
		.map(k => parseInt(style.getPropertyValue(k), 10))
		.reduce((prev, cur) => prev + cur, h);
	return [w, h];
}

/**
 * @typedef {Object} ParsedMimeType
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
	/** @type {Object.<string, string>} */
	const params = {};
	for (const [name, value] of paramsStr.map(p => p.trim().split("="))) {
		params[name] = value;
	}
	return {type, subType, parameters: params};
}

export function handleDuplicateName(existingNames, prefix, suffix = "", numberPrefix = " ") {
	if (!Array.isArray(existingNames) && typeof existingNames == "object" && existingNames.files && existingNames.directories) {
		existingNames = [...existingNames.files, ...existingNames.directories];
	}
	if (!existingNames.includes(prefix + suffix)) return prefix + suffix;
	let i = 0;
	while (true) {
		i++;
		const newName = prefix + numberPrefix + i + suffix;
		if (!existingNames.includes(newName)) return newName;
	}
}

export function prettifyVariableName(variableName) {
	variableName = String(variableName);
	const words = variableName.split(/(?<=[a-z])(?=[A-Z]+)/);
	const capitalizedWords = words.map(w => {
		if (w && w.length != 0) {
			return w[0].toUpperCase() + w.slice(1).toLowerCase();
		} else {
			return w;
		}
	});
	return capitalizedWords.join(" ");
}
