import "../../../shared/initializeEditor.js";

import {assertEquals, assertExists} from "asserts";
import {ProjectAssetTypeMaterial} from "../../../../../../editor/src/assets/projectAssetType/ProjectAssetTypeMaterial.js";
import {createMockDependencies} from "./shared.js";

Deno.test({
	name: "Creating a new asset",
	async fn() {
		const {projectAssetTypeArgs} = createMockDependencies();
		const projectAssetType = new ProjectAssetTypeMaterial(...projectAssetTypeArgs);
		const {liveAsset, editorData} = await projectAssetType.createNewLiveAssetData();
		const assetData = await projectAssetType.saveLiveAssetData(liveAsset || null, editorData || null);

		assertEquals(assetData, {});
	},
});

Deno.test({
	name: "getLiveAssetData() with no material map",
	async fn() {
		const {projectAssetTypeArgs} = createMockDependencies();
		const projectAssetType = new ProjectAssetTypeMaterial(...projectAssetTypeArgs);
		const liveAssetData = await projectAssetType.getLiveAssetData(null);

		assertExists(liveAssetData.liveAsset);
		assertEquals(liveAssetData.liveAsset.materialMap, null);
	},
});
