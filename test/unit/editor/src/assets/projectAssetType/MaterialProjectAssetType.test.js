import "../../../shared/initializeEditor.js";
import {assertEquals, assertExists, assertStrictEquals} from "std/testing/asserts";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock";
import {MaterialProjectAssetType} from "../../../../../../editor/src/assets/projectAssetType/MaterialProjectAssetType.js";
import {createMockDependencies} from "./shared.js";
import {Material, Vec3} from "../../../../../../src/mod.js";
import {MaterialMap} from "../../../../../../src/rendering/MaterialMap.js";
import {createMockProjectAsset} from "../shared/createMockProjectAsset.js";
import {DEFAULT_MATERIAL_MAP_UUID} from "../../../../../../editor/src/assets/builtinAssetUuids.js";
import {Texture} from "../../../../../../src/core/Texture.js";

const BASIC_MATERIAL_MAP_UUID = "basic material map uuid";
const BASIC_GENERIC_ASSET_UUID = "ba51c000-9e0e-61c0-0000-0000000a55e7";

function basicSetup() {
	const mockBasicMaterialMapLiveAsset = /** @type {unknown} */ (Symbol("basic material map live asset"));
	const mockDefaultMaterialMapLiveAsset = /** @type {unknown} */ (Symbol("default material map live asset"));
	const basicMaterialMapLiveAsset = /** @type {MaterialMap} */ (mockBasicMaterialMapLiveAsset);
	const defaultMaterialMapLiveAsset = /** @type {MaterialMap} */ (mockDefaultMaterialMapLiveAsset);
	/** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetAny[]} */
	const createdProjectAssets = [];

	const {projectAssetTypeArgs, assetManager} = createMockDependencies({
		getAssetUuidOrEmbeddedAssetDataFromLiveAssetImpl: liveAsset => {
			if (liveAsset == basicMaterialMapLiveAsset) {
				return BASIC_MATERIAL_MAP_UUID;
			} else if (liveAsset == defaultMaterialMapLiveAsset) {
				return DEFAULT_MATERIAL_MAP_UUID;
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
	const projectAssetType = new MaterialProjectAssetType(...projectAssetTypeArgs);

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
		assetManager,
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
	name: "getLiveAssetData() with a material map with properties",
	async fn() {
		const {projectAssetType, basicMaterialMapLiveAsset, assetManager} = basicSetup();
		const basicGenericLiveAsset = {label: "basic generic live asset"};
		stub(assetManager, "getLiveAsset", async uuid => {
			if (uuid == BASIC_GENERIC_ASSET_UUID) {
				return basicGenericLiveAsset;
			}
			return null;
		});
		const setPropertiesStub = stub(Material.prototype, "setProperties", () => {});
		const liveAssetData = await projectAssetType.getLiveAssetData({
			map: BASIC_MATERIAL_MAP_UUID,
			properties: {
				vec3: [1, 2, 3],
				asset: BASIC_GENERIC_ASSET_UUID,
			},
		});

		assertExists(liveAssetData.liveAsset);
		assertStrictEquals(liveAssetData.liveAsset.materialMap, basicMaterialMapLiveAsset);
		assertSpyCalls(setPropertiesStub, 1);
		assertSpyCall(setPropertiesStub, 0, {
			args: [
				{
					asset: basicGenericLiveAsset,
					vec3: [1, 2, 3],
				},
			],
		});
		assertStrictEquals(setPropertiesStub.calls[0].args[0].asset, basicGenericLiveAsset);
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

		assertEquals(assetData, {
			map: null,
		});
	},
});

Deno.test({
	name: "saveLiveAssetData() with the default material map",
	async fn() {
		const {projectAssetType, defaultMaterialMapLiveAsset} = basicSetup();

		const material = new Material();
		material.setMaterialMap(defaultMaterialMapLiveAsset);
		const assetData = await projectAssetType.saveLiveAssetData(material, null);

		assertEquals(assetData, {});
	},
});

Deno.test({
	name: "saveLiveAssetData() with a material map",
	async fn() {
		const {projectAssetType, basicMaterialMapLiveAsset} = basicSetup();

		const material = new Material();
		material.setMaterialMap(basicMaterialMapLiveAsset);
		const assetData = await projectAssetType.saveLiveAssetData(material, null);

		assertEquals(assetData, {
			map: BASIC_MATERIAL_MAP_UUID,
		});
	},
});

Deno.test({
	name: "saveLiveAssetData() with an embedded material map",
	async fn() {
		const {projectAssetType, assetManager} = basicSetup();

		const material = new Material();
		const embeddedMaterialMap = new MaterialMap();
		const BASIC_TEXTURE_UUID = "basic texture uuid";
		const embeddedData = {label: "embedded data"};
		const texture = new Texture();

		stub(assetManager, "getAssetUuidOrEmbeddedAssetDataFromLiveAsset", liveAsset => {
			if (liveAsset == texture) {
				return BASIC_TEXTURE_UUID;
			} else if (liveAsset == embeddedMaterialMap) {
				return embeddedData;
			}
			return null;
		});

		material.setMaterialMap(embeddedMaterialMap);
		material.setProperty("num", 42);
		material.setProperty("vec3", new Vec3(1, 2, 3));
		material.setProperty("texture", texture);
		const assetData = await projectAssetType.saveLiveAssetData(material, null);

		assertEquals(assetData, {
			map: embeddedData,
			properties: {
				num: 42,
				vec3: [1, 2, 3],
				texture: BASIC_TEXTURE_UUID,
			},
		});
	},
});
