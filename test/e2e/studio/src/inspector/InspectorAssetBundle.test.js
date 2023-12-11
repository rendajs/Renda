import {log} from "../../../shared/log.js";
import {runE2eTest} from "../../../shared/runE2eTest.js";
import {click} from "../../../shared/util.js";
import {loadE2eProject} from "../../shared/project.js";
import {getPage} from "../../../shared/browser.js";
import {waitForContentWindowElement} from "../../shared/contentWindows.js";

await runE2eTest({
	name: "Assets are loaded via the InspectorAssetBundle",
	// TODO: Enable when #817 is fixed
	ignore: true,
	async fn() {
		const {page} = await getPage();
		await loadE2eProject(page, "inspector-asset-bundle");

		const buildViewEl = await waitForContentWindowElement(page, "renda:buildView");

		const runApplicationButtonEl = await buildViewEl.$(".studio-content-window-top-button-bar .button[title='Run Application']");
		if (!runApplicationButtonEl) {
			throw new Error("Run Application button wasn't found");
		}
		log("Click run application button");
		await click(page, runApplicationButtonEl);

		await page.waitForFunction(buildViewEl => {
			const iframe = buildViewEl.querySelector("iframe");
			const textContent = iframe?.contentDocument?.body?.textContent;
			if (!textContent) return;
			return textContent.includes("Successfully loaded entity: Entity name");
		}, {}, buildViewEl);
	},
});
