import "../../../shared/initializeEditor.js";
import {assertEquals, assertExists} from "asserts";
import {ProjectAssetTypeMaterial} from "../../../../../../editor/src/assets/projectAssetType/ProjectAssetTypeMaterial.js";
import {createMockDependencies} from "./shared.js";
import {Material} from "../../../../../../src/mod.js";
import {MaterialMap} from "../../../../../../src/rendering/MaterialMap.js";

const BASIC_MATERIAL_MAP_UUID = "basic material map uuid";

function basicSetup() {
	const {projectAssetTypeArgs} = createMockDependencies({
		getAssetUuidFromLiveAssetImpl: liveAsset => {
			if (liveAsset instanceof MaterialMap) {
				return BASIC_MATERIAL_MAP_UUID;
			}
			return null;
		},
	});
	const projectAssetType = new ProjectAssetTypeMaterial(...projectAssetTypeArgs);

	return {projectAssetType};
}

Deno.test({
	name: "Creating a new asset",
	async fn() {
		const {projectAssetType} = basicSetup();
		const {liveAsset, editorData} = await projectAssetType.createNewLiveAssetData();
		const assetData = await projectAssetType.saveLiveAssetData(liveAsset || null, editorData || null);

		assertEquals(assetData, {});
	},
});

Deno.test({
	name: "getLiveAssetData() with no material map",
	async fn() {
		const {projectAssetType} = basicSetup();
		const liveAssetData = await projectAssetType.getLiveAssetData(null);

		assertExists(liveAssetData.liveAsset);
		assertEquals(liveAssetData.liveAsset.materialMap, null);
	},
});

Deno.test({
	name: "saveLiveAssetData() with no live asset",
	async fn() {
		const {projectAssetType} = basicSetup();

		const assetData = await projectAssetType.saveLiveAssetData(null, null);

		assertEquals(assetData, {});
	},
});

Deno.test({
	name: "saveLiveAssetData() with no material map",
	async fn() {
		const {projectAssetType} = basicSetup();

		const material = new Material();
		const assetData = await projectAssetType.saveLiveAssetData(material, null);

		assertEquals(assetData, {});
	},
});

Deno.test({
	name: "saveLiveAssetData() with a material map",
	async fn() {
		const {projectAssetType} = basicSetup();

		const material = new Material();
		const materialMap = new MaterialMap();
		material.setMaterialMap(materialMap);
		const assetData = await projectAssetType.saveLiveAssetData(material, null);

		assertEquals(assetData, {
			map: BASIC_MATERIAL_MAP_UUID,
		});
	},
});
