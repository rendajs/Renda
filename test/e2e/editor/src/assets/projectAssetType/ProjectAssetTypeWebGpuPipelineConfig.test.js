import {getContext, puppeteerSanitizers} from "../../../../shared/browser.js";
import {createAsset, getAssetTreeView} from "../../../shared/assets.js";
import {setupNewProject} from "../../../shared/project.js";

Deno.test({
	name: "Creating a new PipelineConfig asset",
	...puppeteerSanitizers,
	async fn(testContext) {
		const {page, disconnect} = await getContext();

		await setupNewProject(page, testContext);

		await createAsset(page, testContext, ["Materials", "New WebGPU Pipeline Config"]);
		await getAssetTreeView(page, ["New Pipeline Config.json"]);

		await disconnect();
	},
});
