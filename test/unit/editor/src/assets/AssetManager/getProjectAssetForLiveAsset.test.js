import {assertEquals, assertExists, assertStrictEquals} from "std/testing/asserts";
import {injectMockEditorInstance} from "../../../../../../editor/src/editorInstance.js";
import {BASIC_ASSET_UUID, BASIC_PROJECTASSETTYPE, basicSetup} from "./shared.js";
import {createMockProjectAsset} from "../shared/createMockProjectAsset.js";

injectMockEditorInstance(/** @type {any} */ ({}));

Deno.test({
	name: "getProjectAssetForLiveAsset() with null",
	async fn() {
		const {assetManager} = await basicSetup();
		const projectAsset = assetManager.getProjectAssetForLiveAsset(null);
		assertEquals(projectAsset, null);
	},
});

Deno.test({
	name: "getProjectAssetForLiveAsset() with live asset from project",
	async fn() {
		const {assetManager} = await basicSetup();
		const projectAsset = await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID);
		const castProjectAsset = /** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAsset<import("../shared/createMockProjectAssetType.js").MockProjectAssetType>?} */ (projectAsset);
		assertExists(castProjectAsset);
		const liveAsset = await castProjectAsset.getLiveAsset();
		const result = assetManager.getProjectAssetForLiveAsset(liveAsset);
		assertStrictEquals(result, castProjectAsset);
	},
});

Deno.test({
	name: "getProjectAssetForLiveAsset() with live asset from embedded asset",
	async fn() {
		const {assetManager} = await basicSetup();
		const {projectAsset: parent} = createMockProjectAsset();
		const embeddedAsset = assetManager.createEmbeddedAsset(BASIC_PROJECTASSETTYPE, parent, "persistenceKey");
		const liveAsset = await embeddedAsset.getLiveAsset();
		const result = assetManager.getProjectAssetForLiveAsset(liveAsset);
		assertStrictEquals(result, embeddedAsset);
	},
});

Deno.test({
	name: "getProjectAssetForLiveAsset() with non-live asset",
	async fn() {
		const {assetManager} = await basicSetup();
		const actual = assetManager.getProjectAssetForLiveAsset({});
		assertEquals(actual, null);
	},
});
