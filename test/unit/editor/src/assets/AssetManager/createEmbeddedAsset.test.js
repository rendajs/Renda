import {assertEquals, assertThrows} from "std/testing/asserts";
import {injectMockEditorInstance} from "../../../../../../editor/src/editorInstance.js";
import {BASIC_PERSISTENCE_KEY, BASIC_PROJECTASSETTYPE, STRINGIFIED_PERSISTENCE_KEY, basicSetup} from "./shared.js";
import {createMockProjectAsset} from "../shared/createMockProjectAsset.js";

injectMockEditorInstance(/** @type {any} */ ({}));

Deno.test({
	name: "createEmbeddedAsset() with an asset type string",
	async fn() {
		const {assetManager} = await basicSetup();
		const {projectAsset: parent} = createMockProjectAsset();

		const embeddedAsset = assetManager.createEmbeddedAsset(BASIC_PROJECTASSETTYPE, parent, BASIC_PERSISTENCE_KEY);

		assertEquals(embeddedAsset.isEmbedded, true);
		assertEquals(embeddedAsset.assetType, BASIC_PROJECTASSETTYPE);
		assertEquals(embeddedAsset.embeddedParentPersistenceKey, STRINGIFIED_PERSISTENCE_KEY);
	},
});

Deno.test({
	name: "createEmbeddedAsset() with a ProjectAssetType constructor",
	async fn() {
		const {assetManager, ProjectAssetType} = await basicSetup();
		const {projectAsset: parent} = createMockProjectAsset();

		const embeddedAsset = assetManager.createEmbeddedAsset(ProjectAssetType, parent, BASIC_PERSISTENCE_KEY);

		assertEquals(embeddedAsset.isEmbedded, true);
		assertEquals(embeddedAsset.assetType, BASIC_PROJECTASSETTYPE);
		assertEquals(embeddedAsset.embeddedParentPersistenceKey, STRINGIFIED_PERSISTENCE_KEY);
	},
});

Deno.test({
	name: "createEmbeddedAsset() throws when no persistence key is set",
	async fn() {
		const {assetManager, ProjectAssetType} = await basicSetup();
		const {projectAsset: parent} = createMockProjectAsset();

		assertThrows(() => {
			assetManager.createEmbeddedAsset(ProjectAssetType, parent, null);
		});
	},
});

Deno.test({
	name: "createEmbeddedAsset() throws when persistence key is an empty string",
	async fn() {
		const {assetManager, ProjectAssetType} = await basicSetup();
		const {projectAsset: parent} = createMockProjectAsset();

		assertThrows(() => {
			assetManager.createEmbeddedAsset(ProjectAssetType, parent, "");
		});
	},
});
