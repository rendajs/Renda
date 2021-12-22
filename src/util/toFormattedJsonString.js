/**
 * Parses an object to a json string and formats it nicely.
 * This keeps things mostly similar to `JSON.stringify` but it collapses small
 * arrays and objects into a single line.
 * @param {Object} jsonObj
 * @param {Object} opts
 * @param {"fileStorage" | "display"} [opts.purpose]
 * @param {number} [opts.maxArrayStringItemLength]
 * @returns {string}
 */
export function toFormattedJsonString(jsonObj, {
	purpose = "fileStorage",
	maxArrayStringItemLength = 10, // use -1 to always put string arrays on a single line
} = {}) {
	const countTabs = str => {
		let tabCount = 0;
		for (const char of str) {
			if (char == "\t") {
				tabCount++;
			} else {
				break;
			}
		}
		return tabCount;
	};

	const jsonStr = JSON.stringify(jsonObj, null, "\t");

	const splitStr = jsonStr.split("\n");
	let removeNewLineIndents = [];

	let prevTabCount = 0;
	let indentStartPos = 0;
	let hasParsedCurrentIndent = false;
	for (let i = 0; i < splitStr.length; i++) {
		const line = splitStr[i];
		const tabCount = countTabs(line);
		if (tabCount > prevTabCount) {
			indentStartPos = i;
			hasParsedCurrentIndent = false;
		} else if (tabCount < prevTabCount && !hasParsedCurrentIndent) {
			hasParsedCurrentIndent = true;
			const lineBeforeIndent = splitStr[indentStartPos - 1];
			removeNewLineIndents.push({
				isObjectIndent: lineBeforeIndent.endsWith("{"),
				isArrayIndent: lineBeforeIndent.endsWith("["),
				start: indentStartPos,
				end: i + 1,
			});
		}
		prevTabCount = tabCount;
	}

	// If the root object is a non-empty object, and the purpose is "fileStorage", don't collapse it.
	if (removeNewLineIndents.length == 1 && removeNewLineIndents[0].isObjectIndent && removeNewLineIndents[0].start == 1 && purpose == "fileStorage") {
		removeNewLineIndents = [];
	}

	const needsNewLinePositions = new Array(splitStr.length).fill(true);
	for (const indent of removeNewLineIndents) {
		if (indent.isObjectIndent) {
			let indentCharCount = 0;
			for (let i = indent.start; i < indent.end - 1; i++) {
				const line = splitStr[i];
				for (const char of line) {
					if (char != "\t") indentCharCount++;
				}
			}
			if (indentCharCount > 40) continue;
		} else if (indent.isArrayIndent) {
			let removeNewLines = true;
			if (maxArrayStringItemLength == 0) {
				removeNewLines = false;
			} else if (maxArrayStringItemLength > 0) {
				for (let i = indent.start; i < indent.end - 1; i++) {
					const line = splitStr[i];
					if (line.includes("\"")) {
						let valueCharCount = 0;
						for (const char of line) {
							if (char != "\t") valueCharCount++;
						}
						if (valueCharCount > maxArrayStringItemLength) {
							removeNewLines = false;
							break;
						}
					}
				}
			}
			if (!removeNewLines) continue;
		}
		for (let i = indent.start; i < indent.end; i++) {
			needsNewLinePositions[i] = false;
		}
	}

	let newStr = "";
	for (let i = 0; i < splitStr.length; i++) {
		let addStr = splitStr[i];
		if (needsNewLinePositions[i] && i != 0) {
			newStr += "\n";
		} else {
			const tabCount = countTabs(addStr);
			addStr = addStr.slice(tabCount);
			if (addStr.endsWith(",") && !needsNewLinePositions[i + 1]) addStr += " ";
		}
		newStr += addStr;
	}

	if (purpose == "fileStorage") {
		newStr += "\n";
	}
	return newStr;
}
