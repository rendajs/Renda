import { draco } from "./draco.js";
import { rollup } from "./rollup.js";

/**
 * @typedef ThirdPartyLicenseInfo
 * @property {string} libraryName
 * @property {string} homepage
 * @property {string} license
 */

/** @type {ThirdPartyLicenseInfo[]} */
export const licenses = [
	rollup,
	draco,
];
