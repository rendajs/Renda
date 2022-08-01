import {assertExists, assertRejects} from "std/testing/asserts";
import {assertSpyCalls, spy} from "std/testing/mock";
import {injectMockEditorInstance} from "../../../../../../editor/src/editorInstance.js";
import {BASIC_PROJECTASSETTYPE, basicSetup} from "./shared.js";

injectMockEditorInstance(/** @type {any} */ ({}));

Deno.test({
	name: "Creating a basic asset",
	async fn() {
		const {assetManager, ProjectAssetType} = await basicSetup();

		const createNewLiveAssetDataSpy = spy(ProjectAssetType.prototype, "createNewLiveAssetData");

		const projectAsset = await assetManager.createNewAsset(["path", "to", "newAsset.json"], BASIC_PROJECTASSETTYPE);

		assertExists(projectAsset);
		assertSpyCalls(createNewLiveAssetDataSpy, 1);
	},
});

Deno.test({
	name: "createNewAsset() throws when the asset type doesn't exist",
	async fn() {
		const {assetManager} = await basicSetup();

		await assertRejects(async () => {
			await assetManager.createNewAsset(["path", "to", "newAsset.json"], "nonExistentAssetType");
		}, Error, `Failed to create asset with type "nonExistentAssetType" because no such type is registered.`);
	},
});
