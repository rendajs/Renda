/**
 * Splits a filename into name and extension.
 * Extension is null if not present.
 * @param {string} fileName
 * @returns {{name: string, extension: string?}}
 */
export function getNameAndExtension(fileName) {
	const dotIndex = fileName.lastIndexOf(".");
	if (dotIndex < 0) {
		return { name: fileName, extension: null };
	}
	const name = fileName.substring(0, dotIndex);
	const extension = fileName.substring(dotIndex + 1);
	return { name, extension };
}
