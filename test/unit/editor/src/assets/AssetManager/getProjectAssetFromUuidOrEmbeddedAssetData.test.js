import {assertEquals, assertExists, assertStrictEquals} from "std/testing/asserts";
import {injectMockEditorInstance} from "../../../../../../editor/src/editorInstance.js";
import {BASIC_ASSET_UUID, BASIC_PERSISTENCE_KEY, BASIC_PROJECTASSETTYPE, STRINGIFIED_PERSISTENCE_KEY, basicSetup} from "./shared.js";
import {createMockProjectAsset} from "../shared/createMockProjectAsset.js";

injectMockEditorInstance(/** @type {any} */ ({}));

Deno.test({
	name: "getProjectAssetFromUuidOrEmbeddedAssetData() with null",
	async fn() {
		const {assetManager, ProjectAssetType} = await basicSetup();
		const {projectAsset: parent} = createMockProjectAsset();
		const result = await assetManager.getProjectAssetFromUuidOrEmbeddedAssetData(null, {
			assertAssetType: ProjectAssetType,
			parentAsset: parent,
			embeddedAssetPersistenceKey: BASIC_PERSISTENCE_KEY,
		});
		assertEquals(result, null);
	},
});

Deno.test({
	name: "getProjectAssetFromUuidOrEmbeddedAssetData() with uuid",
	async fn() {
		const {assetManager, ProjectAssetType} = await basicSetup();
		const {projectAsset: parent} = createMockProjectAsset();
		const result = await assetManager.getProjectAssetFromUuidOrEmbeddedAssetData(BASIC_ASSET_UUID, {
			assertAssetType: ProjectAssetType,
			parentAsset: parent,
			embeddedAssetPersistenceKey: "persistenceKey",
		});
		const projectAsset = await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID);
		assertStrictEquals(result, projectAsset);
	},
});

Deno.test({
	name: "getProjectAssetFromUuidOrEmbeddedAssetData() with embedded asset data",
	async fn() {
		const {assetManager, ProjectAssetType} = await basicSetup();
		const {projectAsset: parent} = createMockProjectAsset();
		const projectAsset = await assetManager.getProjectAssetFromUuidOrEmbeddedAssetData({
			num: 123,
			str: "foo",
		}, {
			assertAssetType: ProjectAssetType,
			parentAsset: parent,
			embeddedAssetPersistenceKey: BASIC_PERSISTENCE_KEY,
		});
		assertExists(projectAsset);
		assertEquals(projectAsset.isEmbedded, true);
		assertEquals(projectAsset.assetType, BASIC_PROJECTASSETTYPE);
		assertEquals(projectAsset.readEmbeddedAssetData(), {
			num: 123,
			str: "foo",
		});
		assertEquals(projectAsset.embeddedParentPersistenceKey, STRINGIFIED_PERSISTENCE_KEY);
	},
});

Deno.test({
	name: "getProjectAssetFromUuidOrEmbeddedAssetData() and a previous live asset still exists",
	async fn() {
		const {assetManager, ProjectAssetType} = await basicSetup();
		const {projectAsset: parent} = createMockProjectAsset();
		const embeddedAsset = assetManager.createEmbeddedAsset(BASIC_PROJECTASSETTYPE, parent, BASIC_PERSISTENCE_KEY);
		const embeddedLiveAsset = await embeddedAsset.getLiveAsset();
		parent.addEmbeddedChildLiveAsset(STRINGIFIED_PERSISTENCE_KEY, embeddedLiveAsset);
		const projectAsset = await assetManager.getProjectAssetFromUuidOrEmbeddedAssetData({
			num: 123,
			str: "foo",
		}, {
			assertAssetType: ProjectAssetType,
			parentAsset: parent,
			embeddedAssetPersistenceKey: BASIC_PERSISTENCE_KEY,
		});
		assertStrictEquals(projectAsset, embeddedAsset);
	},
});
