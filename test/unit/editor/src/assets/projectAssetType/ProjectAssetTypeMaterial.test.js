import "../../../shared/initializeEditor.js";

import {assertEquals} from "asserts";
import {ProjectAssetTypeMaterial} from "../../../../../../editor/src/assets/projectAssetType/ProjectAssetTypeMaterial.js";
import {createMockDependencies} from "./shared.js";

Deno.test({
	name: "Creating a new asset",
	async fn() {
		const {editor, projectAsset, assetManager, assetTypeManager} = createMockDependencies();
		const projectAssetType = new ProjectAssetTypeMaterial(editor, projectAsset, assetManager, assetTypeManager);
		const {liveAsset, editorData} = await projectAssetType.createNewLiveAssetData();
		const assetData = await projectAssetType.saveLiveAssetData(liveAsset, editorData);

		assertEquals(assetData, {});
	},
});
