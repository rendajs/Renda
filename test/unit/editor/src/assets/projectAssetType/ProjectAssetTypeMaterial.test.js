import "../../../shared/initializeEditor.js";
import {assertEquals, assertExists, assertStrictEquals} from "std/testing/asserts";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock";
import {ProjectAssetTypeMaterial} from "../../../../../../editor/src/assets/projectAssetType/ProjectAssetTypeMaterial.js";
import {createMockDependencies} from "./shared.js";
import {Material} from "../../../../../../src/mod.js";
import {MaterialMap} from "../../../../../../src/rendering/MaterialMap.js";
import {createMockProjectAsset} from "../shared/createMockProjectAsset.js";
import {DEFAULT_MATERIAL_MAP_UUID} from "../../../../../../editor/src/assets/builtinAssetUuids.js";

const BASIC_MATERIAL_MAP_UUID = "basic material map uuid";

/**
 * @param {Object} [options]
 * @param {import("../../../../../../src/mod.js").UuidString | object | null} [options.getMaterialMapReturnValue]
 */
function basicSetup({
	getMaterialMapReturnValue = BASIC_MATERIAL_MAP_UUID,
} = {}) {
	const basicMaterialMapLiveAsset = Symbol("basic material map live asset");
	const defaultMaterialMapLiveAsset = Symbol("default material map live asset");
	/** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetAny[]} */
	const createdProjectAssets = [];

	const {projectAssetTypeArgs, assetManager} = createMockDependencies({
		getAssetUuidOrEmbeddedAssetDataFromLiveAssetImpl: liveAsset => {
			if (liveAsset instanceof MaterialMap) {
				return getMaterialMapReturnValue;
			}
			return null;
		},
		async getProjectAssetFromUuidOrEmbeddedAssetDataImpl(uuidOrData, options) {
			if (uuidOrData == BASIC_MATERIAL_MAP_UUID) {
				const {projectAsset} = createMockProjectAsset({liveAsset: basicMaterialMapLiveAsset});
				createdProjectAssets.push(projectAsset);
				return projectAsset;
			}
			return null;
		},
	});
	const projectAssetType = new ProjectAssetTypeMaterial(...projectAssetTypeArgs);

	const {projectAsset: defaultMaterialMapProjectAsset} = createMockProjectAsset({liveAsset: defaultMaterialMapLiveAsset});

	const getProjectAssetFromUuidStub = stub(assetManager, "getProjectAssetFromUuid", async (uuid, options) => {
		if (uuid == DEFAULT_MATERIAL_MAP_UUID) {
			return defaultMaterialMapProjectAsset;
		}
		return null;
	});

	return {
		projectAssetType,
		basicMaterialMapLiveAsset,
		defaultMaterialMapLiveAsset,
		createdProjectAssets,
		getProjectAssetFromUuidStub,
	};
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
	name: "getLiveAssetData() with no data",
	async fn() {
		const {projectAssetType, defaultMaterialMapLiveAsset} = basicSetup();
		const liveAssetData = await projectAssetType.getLiveAssetData(null);

		assertExists(liveAssetData.liveAsset);
		assertStrictEquals(liveAssetData.liveAsset.materialMap, defaultMaterialMapLiveAsset);
	},
});

Deno.test({
	name: "getLiveAssetData() with no material map uses the default value",
	async fn() {
		const {projectAssetType, defaultMaterialMapLiveAsset} = basicSetup();
		const liveAssetData = await projectAssetType.getLiveAssetData({});

		assertExists(liveAssetData.liveAsset);
		assertStrictEquals(liveAssetData.liveAsset.materialMap, defaultMaterialMapLiveAsset);
	},
});

Deno.test({
	name: "getLiveAssetData() with null material map has no material map",
	async fn() {
		const {projectAssetType} = basicSetup();
		const liveAssetData = await projectAssetType.getLiveAssetData({
			map: null,
		});

		assertExists(liveAssetData.liveAsset);
		assertEquals(liveAssetData.liveAsset.materialMap, null);
	},
});

Deno.test({
	name: "getLiveAssetData() with a material map uuid",
	async fn() {
		const {projectAssetType, basicMaterialMapLiveAsset, createdProjectAssets} = basicSetup();
		const listenForUsedLiveAssetChangesSpy = spy(projectAssetType, "listenForUsedLiveAssetChanges");
		const liveAssetData = await projectAssetType.getLiveAssetData({
			map: BASIC_MATERIAL_MAP_UUID,
		});

		assertExists(liveAssetData.liveAsset);
		assertStrictEquals(liveAssetData.liveAsset.materialMap, basicMaterialMapLiveAsset);
		assertSpyCalls(listenForUsedLiveAssetChangesSpy, 1);
		assertSpyCall(listenForUsedLiveAssetChangesSpy, 0, {
			args: [createdProjectAssets[0]],
		});
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
		const {projectAssetType} = basicSetup({
			getMaterialMapReturnValue: null,
		});

		const material = new Material();
		const assetData = await projectAssetType.saveLiveAssetData(material, null);

		assertEquals(assetData, {
			map: null,
		});
	},
});

Deno.test({
	name: "saveLiveAssetData() with the default material map",
	async fn() {
		const {projectAssetType} = basicSetup({
			getMaterialMapReturnValue: DEFAULT_MATERIAL_MAP_UUID,
		});

		const material = new Material();
		const materialMap = new MaterialMap();
		material.setMaterialMap(materialMap);
		const assetData = await projectAssetType.saveLiveAssetData(material, null);

		assertEquals(assetData, {});
	},
});

Deno.test({
	name: "saveLiveAssetData() with a material map",
	async fn() {
		const {projectAssetType} = basicSetup({
			getMaterialMapReturnValue: BASIC_MATERIAL_MAP_UUID,
		});

		const material = new Material();
		const materialMap = new MaterialMap();
		material.setMaterialMap(materialMap);
		const assetData = await projectAssetType.saveLiveAssetData(material, null);

		assertEquals(assetData, {
			map: BASIC_MATERIAL_MAP_UUID,
		});
	},
});

Deno.test({
	name: "saveLiveAssetData() with an embedded material map",
	async fn() {
		const {projectAssetType} = basicSetup({
			getMaterialMapReturnValue: {
				embeddedData: "data",
			},
		});

		const material = new Material();
		const materialMap = new MaterialMap();
		material.setMaterialMap(materialMap);
		const assetData = await projectAssetType.saveLiveAssetData(material, null);

		assertEquals(assetData, {
			map: {
				embeddedData: "data",
			},
		});
	},
});
