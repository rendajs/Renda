import {getContext, init} from "../../../shared/browser.js";
import {waitFor} from "../../../shared/util.js";

await init();

Deno.test({
	name: "Project selector should be visible on page load",
	fn: async testContext => {
		const {page} = await getContext();

		await waitFor(page, ".project-selector-window", {visible: true});
	},
	sanitizeOps: false,
	sanitizeResources: false,
});
