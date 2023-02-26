import {wait} from "../../../../src/util/Timeout.js";
import {log} from "../../shared/log.js";

/**
 * @param {number} seconds
 */
export async function waitSeconds(seconds) {
	log(`Waiting ${seconds} seconds`);
	await wait(seconds * 1000);
}
