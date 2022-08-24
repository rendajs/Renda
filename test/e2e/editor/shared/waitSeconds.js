import {wait} from "../../../../src/util/Timeout.js";

/**
 * @param {Deno.TestContext} testContext
 * @param {number} seconds
 */
export async function waitSeconds(testContext, seconds) {
	await testContext.step("Waiting 5 seconds", async () => {
		await wait(seconds * 1000);
	});
}
