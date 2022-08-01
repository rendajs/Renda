import {assertEquals, assertExists, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {injectMockEditorInstance} from "../../../../../../editor/src/editorInstance.js";
import {BASIC_ASSET_UUID, BASIC_PERSISTENCE_KEY, BASIC_PROJECTASSETTYPE, basicSetup} from "./shared.js";
import {createMockProjectAsset} from "../shared/createMockProjectAsset.js";

injectMockEditorInstance(/** @type {any} */ ({}));

Deno.test({
	name: "getAssetUuidFromLiveAsset() with null",
	async fn() {
		const {assetManager} = await basicSetup();
		const result = assetManager.getAssetUuidFromLiveAsset(null);
		assertEquals(result, null);
	},
});

Deno.test({
	name: "getAssetUuidFromLiveAsset() with live asset from project",
	async fn() {
		const {assetManager} = await basicSetup();
		const projectAsset = await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID);
		const castProjectAsset = /** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAsset<import("../shared/createMockProjectAssetType.js").MockProjectAssetType>?} */ (projectAsset);
		assertExists(castProjectAsset);
		const liveAsset = await castProjectAsset.getLiveAsset();
		const uuid = assetManager.getAssetUuidFromLiveAsset(liveAsset);
		assertStrictEquals(uuid, BASIC_ASSET_UUID);
	},
});

Deno.test({
	name: "getAssetUuidFromLiveAsset() with embedded asset throws",
	async fn() {
		const {assetManager} = await basicSetup();
		const {projectAsset: parent} = createMockProjectAsset();
		const embeddedAsset = assetManager.createEmbeddedAsset(BASIC_PROJECTASSETTYPE, parent, BASIC_PERSISTENCE_KEY);
		const liveAsset = await embeddedAsset.getLiveAsset();
		assertThrows(() => {
			assetManager.getAssetUuidFromLiveAsset(liveAsset);
		}, Error, "The provided live asset is from an embedded asset, embedded assets do not have UUIDs. Use getAssetUuidOrEmbeddedAssetDataFromLiveAsset() instead.");
	},
});
