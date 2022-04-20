import {getContext, initBrowser, puppeteerSanitizers} from "../../../../shared/browser.js";
import {createAsset, getAssetTreeView, setupNewProject} from "../../../shared/common.js";

await initBrowser();

Deno.test({
	name: "Creating a new PipelineConfig asset",
	...puppeteerSanitizers,
	async fn(testContext) {
		const {page} = await getContext();

		await setupNewProject(page, testContext);

		await createAsset(page, testContext, ["Materials", "New WebGPU Pipeline Config"]);
		await getAssetTreeView(page, ["New Pipeline Config.json"]);
	},
});
