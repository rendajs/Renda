import { getPage } from "../../../../shared/browser.js";
import { runE2eTest } from "../../../../shared/runE2eTest.js";
import { createAsset, getAssetTreeView } from "../../../shared/contentWindows/project.js";
import { setupNewProject } from "../../../shared/project.js";

await runE2eTest({
	name: "Creating a new PipelineConfig asset",
	async fn() {
		const { page } = await getPage();
		await setupNewProject(page);

		await createAsset(page, ["Materials", "New WebGPU Pipeline Config"]);
		await getAssetTreeView(page, ["New Pipeline Config.json"]);
	},
});
