import {assertEquals, assertExists} from "std/testing/asserts.ts";
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
		const projectAsset = await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID);
		const castProjectAsset = /** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAsset<import("../shared/createMockProjectAssetType.js").MockProjectAssetType>?} */ (projectAsset);
		assertExists(castProjectAsset);
		const liveAsset = await castProjectAsset.getLiveAsset();
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
