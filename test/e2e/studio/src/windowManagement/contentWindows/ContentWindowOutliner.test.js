import {assertEquals} from "std/testing/asserts.ts";
import {log} from "../../../../shared/log.js";
import {runE2eTest} from "../../../../shared/runE2eTest.js";
import {click, drag, waitFor} from "../../../../shared/util.js";
import {clickAsset, createAsset} from "../../../shared/assets.js";
import {clickCreateEmptyButton, getOutlinerRootEntityTreeView} from "../../../shared/contentWindows/outliner.js";
import {setupNewProject} from "../../../shared/project.js";
import {getPage} from "../../../../shared/browser.js";
import {wait} from "../../../../../../src/util/Timeout.js";

/**
 * @param {import("puppeteer").Page} page
 * @param {number} expectedRootChildCount
 * @param {number[]} expectedSubChildCount
 */
async function assertRootChildCount(page, expectedRootChildCount, expectedSubChildCount) {
	log("Select root entity");
	{
		const rootTreeView = await getOutlinerRootEntityTreeView(page);
		const rootTreeViewRow = await waitFor(rootTreeView, ".tree-view-row");
		await click(page, rootTreeViewRow);
	}

	log("Verify entity structure");
	{
		const rootChildCount = await page.evaluate(() => {
			return globalThis.studio?.selected.entity.childCount;
		});
		assertEquals(rootChildCount, expectedRootChildCount);

		const subChildCount = await page.evaluate(() => {
			const castEntity = /** @type {import("../../../../../../src/core/Entity.js").Entity?} */ (globalThis.studio?.selected.entity);
			return castEntity?.children.map(child => child.childCount);
		});
		assertEquals(subChildCount, expectedSubChildCount);
	}
}

await runE2eTest({
	name: "Dragging entities within a hierarchy",
	forceRunCount: 100,
	async fn() {
		const {page} = await getPage();
		await setupNewProject(page);

		await createAsset(page, ["New Entity"]);

		await clickAsset(page, ["New Entity.json"], {
			clickCount: 2,
		});

		await wait(1000);
		log("Create three children");
		for (let i = 0; i < 3; i++) {
			await clickCreateEmptyButton(page);
		}

		await assertRootChildCount(page, 3, [0, 0, 0]);

		log("Click the second created child");
		{
			const rootTreeView = await getOutlinerRootEntityTreeView(page);
			const secondChildEl = await waitFor(rootTreeView, ".tree-view-child-list > :nth-child(2)");
			await click(page, secondChildEl);
		}

		log("Create a new subchild");
		await clickCreateEmptyButton(page);

		log("Drag the subchild to the root");
		{
			const rootTreeView = await getOutlinerRootEntityTreeView(page);
			const rootTreeViewRow = await waitFor(rootTreeView, ".tree-view-row");
			const secondChildEl = await waitFor(rootTreeView, ".tree-view-child-list > :nth-child(2) > .tree-view-child-list > :nth-child(1) > .tree-view-row");
			await drag(page, secondChildEl, rootTreeViewRow);
		}

		await assertRootChildCount(page, 4, [0, 0, 0, 0]);
	},
});
