import {assertEquals, assertExists} from "asserts";
import {injectMockEditorInstance} from "../../../../../../editor/src/editorInstance.js";
import {BASIC_ASSET_UUID, BASIC_PROJECTASSETTYPE, basicSetup} from "./shared.js";
import {createMockProjectAsset} from "../shared/createMockProjectAsset.js";

injectMockEditorInstance(/** @type {any} */ ({}));

Deno.test({
	name: "getAssetUuidOrEmbeddedAssetDataFromLiveAsset() with null",
	async fn() {
		const {assetManager} = await basicSetup();
		const result = assetManager.getAssetUuidOrEmbeddedAssetDataFromLiveAsset(null);
		assertEquals(result, null);
	},
});

Deno.test({
	name: "getAssetUuidOrEmbeddedAssetDataFromLiveAsset() with live asset from project",
	async fn() {
		const {assetManager} = await basicSetup();
		/** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAsset<import("../shared/createMockProjectAssetType.js").MockProjectAssetType>?} */
		const projectAsset = await assetManager.getProjectAsset(BASIC_ASSET_UUID);
		assertExists(projectAsset);
		const liveAsset = await projectAsset.getLiveAsset();
		const result = assetManager.getAssetUuidOrEmbeddedAssetDataFromLiveAsset(liveAsset);
		assertEquals(result, BASIC_ASSET_UUID);
	},
});

Deno.test({
	name: "getAssetUuidOrEmbeddedAssetDataFromLiveAsset() with live asset from embedded asset",
	async fn() {
		const {assetManager} = await basicSetup();
		const {projectAsset: parent} = createMockProjectAsset();
		const embeddedAsset = assetManager.createEmbeddedAsset(BASIC_PROJECTASSETTYPE, parent, "persistenceKey");
		await embeddedAsset.writeAssetData({
			num: 123,
			str: "foo",
		});
		const liveAsset = await embeddedAsset.getLiveAsset();
		const result = assetManager.getAssetUuidOrEmbeddedAssetDataFromLiveAsset(liveAsset);
		assertEquals(result, {
			num: 123,
			str: "foo",
		});
	},
});
