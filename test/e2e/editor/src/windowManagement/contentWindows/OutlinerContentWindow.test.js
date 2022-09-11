import {assertEquals} from "std/testing/asserts.ts";
import {getContext, puppeteerSanitizers} from "../../../../shared/browser.js";
import {click, drag, elementWaitForSelector} from "../../../../shared/util.js";
import {clickAsset, createAsset} from "../../../shared/assets.js";
import {clickCreateEmptyButton, getOutlinerRootEntityTreeView} from "../../../shared/contentWindows/outliner.js";
import {setupNewProject} from "../../../shared/project.js";

Deno.test({
	name: "Dragging entities within a scene",
	...puppeteerSanitizers,
	async fn(testContext) {
		const {page, disconnect} = await getContext();

		await setupNewProject(page, testContext);

		await createAsset(page, testContext, ["New Entity"]);

		await clickAsset(page, testContext, ["New Entity.json"], {
			clickCount: 2,
		});

		for (let i = 0; i < 3; i++) {
			await clickCreateEmptyButton(page, testContext);
		}

		await testContext.step({
			name: "Click the second child",
			async fn() {
				const rootTreeView = await getOutlinerRootEntityTreeView(page);
				const secondChildEl = await elementWaitForSelector(page, rootTreeView, ".treeViewChildList > :nth-child(2)");
				await click(page, secondChildEl);
			},
		});

		await clickCreateEmptyButton(page, testContext);

		await testContext.step({
			name: "Drag the new child to the root",
			async fn() {
				const rootTreeView = await getOutlinerRootEntityTreeView(page);
				const rootTreeViewRow = await elementWaitForSelector(page, rootTreeView, ".treeViewRow");
				const secondChildEl = await elementWaitForSelector(page, rootTreeView, ".treeViewChildList > :nth-child(2) > .treeViewChildList > :nth-child(1) > .treeViewRow");
				await drag(page, secondChildEl, rootTreeViewRow);
			},
		});

		// assert that the internal entity structure matches the visual outliner structure
		const rootTreeView = await getOutlinerRootEntityTreeView(page);
		const rootTreeViewRow = await elementWaitForSelector(page, rootTreeView, ".treeViewRow");
		await click(page, rootTreeViewRow);

		const rootChildCount = await page.evaluate(() => {
			return globalThis.editor?.selected.entity.childCount;
		});
		assertEquals(rootChildCount, 4);

		const childChildCounts = await page.evaluate(() => {
			const castEntity = /** @type {import("../../../../../../src/core/Entity.js").Entity?} */ (globalThis.editor?.selected.entity);
			return castEntity?.children.map(child => child.childCount);
		});
		assertEquals(childChildCounts, [0, 0, 0, 0]);

		await disconnect();
	},
});
