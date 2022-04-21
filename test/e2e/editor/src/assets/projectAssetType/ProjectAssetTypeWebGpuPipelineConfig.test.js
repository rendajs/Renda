import {getContext, initBrowser, puppeteerSanitizers} from "../../../../shared/browser.js";
import {createAsset, getAssetTreeView} from "../../../shared/assets.js";
import {setupNewProject} from "../../../shared/project.js";

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
