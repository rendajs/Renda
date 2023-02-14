import {assertEquals, assertExists, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {injectMockStudioInstance} from "../../../../../../studio/src/studioInstance.js";
import {BASIC_ASSET_UUID, BASIC_PERSISTENCE_KEY, BASIC_PROJECTASSETTYPE, STRINGIFIED_PERSISTENCE_KEY, basicSetup} from "./shared.js";
import {createMockProjectAsset} from "../../../shared/createMockProjectAsset.js";

injectMockStudioInstance(/** @type {any} */ ({}));

Deno.test({
	name: "getProjectAssetFromUuidOrEmbeddedAssetDataSync() with null",
	async fn() {
		const {assetManager, ProjectAssetType} = await basicSetup();
		const {projectAsset: parent} = createMockProjectAsset();
		const result = assetManager.getProjectAssetFromUuidOrEmbeddedAssetDataSync(null, {
			assertAssetType: ProjectAssetType,
			parentAsset: parent,
			embeddedAssetPersistenceKey: BASIC_PERSISTENCE_KEY,
		});
		assertEquals(result, null);
	},
});

Deno.test({
	name: "getProjectAssetFromUuidOrEmbeddedAssetDataSync() with uuid, but the existing asset hasn't been initialized yet",
	async fn() {
		const {assetManager, ProjectAssetType} = await basicSetup();
		const {projectAsset: parent} = createMockProjectAsset();

		assertThrows(() => {
			assetManager.getProjectAssetFromUuidOrEmbeddedAssetDataSync(BASIC_ASSET_UUID, {
				assertAssetType: ProjectAssetType,
				parentAsset: parent,
				embeddedAssetPersistenceKey: "persistenceKey",
			});
		}, Error, `Unexpected asset type while getting project asset. Expected "test:basicprojectassettype" but got "none".`);
	},
});

Deno.test({
	name: "getProjectAssetFromUuidOrEmbeddedAssetDataSync() with uuid",
	async fn() {
		const {assetManager, ProjectAssetType} = await basicSetup();
		const {projectAsset: parent} = createMockProjectAsset();
		const projectAsset = await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID);
		assertExists(projectAsset);
		await projectAsset.waitForInit();

		const result = assetManager.getProjectAssetFromUuidOrEmbeddedAssetDataSync(BASIC_ASSET_UUID, {
			assertAssetType: ProjectAssetType,
			parentAsset: parent,
			embeddedAssetPersistenceKey: "persistenceKey",
		});
		assertStrictEquals(result, projectAsset);
	},
});

Deno.test({
	name: "getProjectAssetFromUuidOrEmbeddedAssetDataSync() with embedded asset data",
	async fn() {
		const {assetManager, ProjectAssetType} = await basicSetup();
		const {projectAsset: parent} = createMockProjectAsset();
		const projectAsset = assetManager.getProjectAssetFromUuidOrEmbeddedAssetDataSync({
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
	name: "getProjectAssetFromUuidOrEmbeddedAssetDataSync() and a previous live asset still exists",
	async fn() {
		const {assetManager, ProjectAssetType} = await basicSetup();
		const {projectAsset: parent} = createMockProjectAsset();
		const embeddedAsset = assetManager.createEmbeddedAsset(BASIC_PROJECTASSETTYPE, parent, BASIC_PERSISTENCE_KEY);
		const embeddedLiveAsset = await embeddedAsset.getLiveAsset();
		parent.addEmbeddedChildLiveAsset(STRINGIFIED_PERSISTENCE_KEY, embeddedLiveAsset);
		const projectAsset = assetManager.getProjectAssetFromUuidOrEmbeddedAssetDataSync({
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
