import {getMockArgs} from "./shared.js";
import {ContentWindowDefaultAssetLinks} from "../../../../../../studio/src/windowManagement/contentWindows/ContentWindowDefaultAssetLinks.js";
import {runWithDomAsync} from "../../../shared/runWithDom.js";
import {stub} from "std/testing/mock.ts";
import {createMockAssetManager} from "../../../shared/createMockAssetManager.js";
import {waitForMicrotasks} from "../../../../shared/waitForMicroTasks.js";
import {assertEquals, assertInstanceOf} from "std/testing/asserts.ts";
import {runWithMockStudioAsync} from "../../../shared/runWithMockStudio.js";
import {assertTreeViewStructureEquals} from "../../../shared/treeViewUtil.js";
import {PropertiesTreeViewEntry} from "../../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeViewEntry.js";

function basicSetup() {
	const {args, mockStudioInstance} = getMockArgs();
	mockStudioInstance.projectManager = /** @type {import("../../../../../../studio/src/projectSelector/ProjectManager.js").ProjectManager} */ ({});
	stub(mockStudioInstance.projectManager, "waitForAssetListsLoad");

	const {assetManager} = createMockAssetManager();
	assetManager.defaultAssetLinks = new Map();
	stub(mockStudioInstance.projectManager, "getAssetManager", async () => assetManager);
	stub(mockStudioInstance.projectManager, "assertAssetManagerExists", () => assetManager);
	stub(assetManager, "getDefaultAssetLink");

	/** @type {Set<import("../../../../../../studio/src/assets/autoRegisterBuiltInDefaultAssetLinks.js").BuiltInDefaultAssetLink>} */
	const registeredAssetLinks = new Set();
	mockStudioInstance.builtInDefaultAssetLinksManager = /** @type {import("../../../../../../studio/src/assets/BuiltInDefaultAssetLinksManager.js").BuiltInDefaultAssetLinksManager} */ ({
		registeredAssetLinks,
	});

	return {
		args,
		registeredAssetLinks,
		studio: mockStudioInstance,
	};
}

Deno.test({
	name: "Shows registered default asset links",
	async fn() {
		await runWithDomAsync(async () => {
			const {args, registeredAssetLinks, studio} = basicSetup();

			registeredAssetLinks.add({
				defaultAssetUuid: "default asset uuid",
				name: "default asset name",
				originalAssetUuid: "original uuid",
			});

			await runWithMockStudioAsync(studio, async () => {
				const contentWindow = new ContentWindowDefaultAssetLinks(...args);
				await waitForMicrotasks();

				assertEquals(contentWindow.builtInAssetLinksTreeView.children.length, 1);
				const treeView = contentWindow.builtInAssetLinksTreeView.children[0];
				assertInstanceOf(treeView, PropertiesTreeViewEntry);
				const value = treeView.getValue();
				assertEquals(value, {
					// These values are null for now, because we haven't mocked the asset manager sufficiently.
					defaultAsset: null,
					originalAsset: null,
				});
			});
		});
	},
});
