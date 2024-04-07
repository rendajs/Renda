import { RENDA_VERSION_STRING } from "../../src/engineDefines.js";
import { parseVersionArg } from "./parseVersionArgs.js";

/**
 * Checks if the version string of renda matches that of the provided version string.
 * If not, an error is printed and the process exits with code 1.
 * This is used in several places before publishing a package to make sure
 * that the code that we're about to publish matches the specified version.
 * @param {string} expectedVersion
 */
export function verifyVersion(expectedVersion) {
	if (RENDA_VERSION_STRING != expectedVersion) {
		console.error(`Expected version to match "${expectedVersion}". Please update engineDefines.js and submit a pull request.`);
		Deno.exit(1);
	}
}

if (import.meta.main) {
	verifyVersion(parseVersionArg());
}
