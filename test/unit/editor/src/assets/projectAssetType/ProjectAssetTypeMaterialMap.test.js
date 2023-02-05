import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {assertEquals, assertInstanceOf, assertStrictEquals} from "std/testing/asserts.ts";
import "../../../shared/initializeEditor.js";
import {ProjectAssetTypeMaterialMap} from "../../../../../../editor/src/assets/projectAssetType/ProjectAssetTypeMaterialMap.js";
import {MaterialMap} from "../../../../../../src/rendering/MaterialMap.js";
import {createMockDependencies, getMockRecursionTracker} from "./shared.js";
import {MaterialMapType} from "../../../../../../src/rendering/MaterialMapType.js";
import {MaterialMapTypeSerializer} from "../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js";
import {AssetLoaderTypeMaterialMap, MaterialMapTypeLoader, StorageType, Vec2, Vec3, Vec4} from "../../../../../../src/mod.js";
import {Texture} from "../../../../../../src/core/Texture.js";
import {Sampler} from "../../../../../../src/rendering/Sampler.js";

const BASIC_MATERIAL_MAP_TYPE_ID = "ab277387-dbf9-4744-874e-bf423e19fdce";
const BASIC_TEXTURE_UUID = "bedadb6f-b5c8-414e-baef-6cf76a229ce5";
const BASIC_SAMPLER_UUID = "62f432e8-a6f7-4b94-b359-207df6055f93";
const MAP_TYPE_REFERENCED_ASSET_UUID = "e8d38f05-0ed6-4426-af10-2a2a3ece686d";
const DUPLICATE_REFERENCED_ASSET_UUID = "c726e574-ae6e-4c67-9266-a8249a7e1dfd";

/**
 * @param {Object} options
 * @param {import("../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue[]} [options.mappableValues] The list of mappable
 * values that the MapTypeSerializer should return.
 * @param {import("../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue[]} [options.extraMappableValues] A list of extra
 * mappable values that the MapTypeSerializer should return on top of the default set of mappable values.
 * @param {import("../../../../../../editor/src/assets/MaterialMapTypeSerializerManager.js").MaterialMapAssetData} [options.readAssetDataReturnValue]
 */
function basicSetup({
	mappableValues = [
		{
			name: "num",
			type: "number",
			defaultValue: 2,
		},
		{
			name: "v2",
			type: "vec2",
			defaultValue: new Vec2(1, 2),
		},
		{
			name: "v3",
			type: "vec3",
			defaultValue: new Vec3(1, 2, 3),
		},
		{
			name: "v4",
			type: "vec4",
			defaultValue: new Vec4(1, 2, 3, 4),
		},
		{
			name: "noDefault",
			type: "vec3",
		},
		{
			name: "samp",
			type: "sampler",
		},
		{
			name: "tex",
			type: "texture2d",
		},
	],
	extraMappableValues = [],
	readAssetDataReturnValue = {},
} = {}) {
	const {projectAssetTypeArgs, editor, assetManager, projectAsset} = createMockDependencies();

	class ExtendedMaterialMapType extends MaterialMapType {
		/**
		 * @param {any} [customData]
		 */
		constructor(customData = null) {
			super();
			this.customData = customData;
		}
	}
	class UnregisteredExtendedMaterialMapType extends MaterialMapType {}

	class ExtendedMaterialMapTypeSerializer extends MaterialMapTypeSerializer {
		static typeUuid = BASIC_MATERIAL_MAP_TYPE_ID;
		static allowExportInAssetBundles = true;

		/**
		 * @override
		 * @param {import("../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapLiveAssetDataContext} context
		 * @param {any} liveAsset
		 */
		static async saveLiveAssetData(context, liveAsset) {
			return {label: "material map type custom data"};
		}

		/**
		 * @override
		 * @param {import("../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapLiveAssetDataContext} context
		 * @param {any} customData
		 */
		static async loadLiveAssetData(context, customData) {
			return new ExtendedMaterialMapType(customData);
		}

		/**
		 * @override
		 * @param {import("../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapLiveAssetDataContext} context
		 * @param {any} customData
		 */
		static async getMappableValues(context, customData) {
			/** @type {import("../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue[]} */
			const values = [
				...mappableValues,
				...extraMappableValues,
			];
			return values;
		}

		/**
		 * @override
		 * @param {any} customData
		 */
		static *getReferencedAssetUuids(customData) {
			yield MAP_TYPE_REFERENCED_ASSET_UUID;
			yield DUPLICATE_REFERENCED_ASSET_UUID;
		}

		static assetBundleBinarySerializationOpts = {
			structure: {
				foo: StorageType.STRING,
			},
			nameIds: {
				foo: 1,
			},
		};
	}

	editor.materialMapTypeSerializerManager = /** @type {import("../../../../../../editor/src/assets/MaterialMapTypeSerializerManager.js").MaterialMapTypeSerializerManager} */ ({
		getTypeByLiveAssetConstructor(mapConstructor) {
			if (mapConstructor == ExtendedMaterialMapType) return ExtendedMaterialMapTypeSerializer;
			return null;
		},
		getTypeByUuid(uuid) {
			if (uuid == BASIC_MATERIAL_MAP_TYPE_ID) return ExtendedMaterialMapTypeSerializer;
			return null;
		},
	});
	const projectAssetType = new ProjectAssetTypeMaterialMap(...projectAssetTypeArgs);

	class MapType {

	}

	class ExtendedMaterialMapTypeLoader extends MaterialMapTypeLoader {
		static get typeUuid() {
			return BASIC_MATERIAL_MAP_TYPE_ID;
		}

		/**
		 * @override
		 * @param {ArrayBuffer} buffer
		 */
		async parseBuffer(buffer) {
			return new MapType();
		}
	}

	stub(projectAsset, "readAssetData", async () => {
		return readAssetDataReturnValue;
	});

	return {
		projectAssetType,
		projectAsset,
		editor,
		ExtendedMaterialMapTypeSerializer,
		ExtendedMaterialMapType,
		UnregisteredExtendedMaterialMapType,
		ExtendedMaterialMapTypeLoader,
		MapType,
		assetManager,
	};
}

Deno.test({
	name: "getLiveAssetData() with null",
	async fn() {
		const {projectAssetType} = basicSetup();
		const recursionTracker = getMockRecursionTracker();

		const {liveAsset} = await projectAssetType.getLiveAssetData(null, recursionTracker);
		assertInstanceOf(liveAsset, MaterialMap);
	},
});

Deno.test({
	name: "getLiveAssetData() without maps property",
	async fn() {
		const {projectAssetType} = basicSetup();
		const recursionTracker = getMockRecursionTracker();

		const {liveAsset} = await projectAssetType.getLiveAssetData({}, recursionTracker);
		assertInstanceOf(liveAsset, MaterialMap);
	},
});

Deno.test({
	name: "getLiveAssetData() with a map without mapped values",
	async fn() {
		const {projectAssetType, ExtendedMaterialMapType} = basicSetup();
		const recursionTracker = getMockRecursionTracker();
		const customData = {label: "material map type custom data"};

		const {liveAsset} = await projectAssetType.getLiveAssetData({
			maps: [
				{
					mapTypeId: BASIC_MATERIAL_MAP_TYPE_ID,
					customData,
				},
			],
		}, recursionTracker);
		assertInstanceOf(liveAsset, MaterialMap);
		const mapTypeInstance = liveAsset.getMapTypeInstance(ExtendedMaterialMapType);
		assertInstanceOf(mapTypeInstance, ExtendedMaterialMapType);
		assertEquals(mapTypeInstance.customData, customData);
	},
});

Deno.test({
	name: "getLiveAssetData() with a map and mapped values",
	async fn() {
		const {projectAssetType, ExtendedMaterialMapType, ExtendedMaterialMapTypeSerializer, assetManager} = basicSetup();
		const recursionTracker = getMockRecursionTracker();
		const customData = {label: "material map type custom data"};
		const textureLiveAsset = new Texture(new Blob());
		const samplerLiveAsset = new Sampler();
		stub(assetManager, "getLiveAsset", async uuid => {
			if (uuid == BASIC_TEXTURE_UUID) {
				return textureLiveAsset;
			} else if (uuid == BASIC_SAMPLER_UUID) {
				return samplerLiveAsset;
			}
			return null;
		});
		stub(ExtendedMaterialMapTypeSerializer, "getMappableValues", async () => {
			/** @type {import("../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue[]} */
			const values = [
				{name: "num", type: "number"},
				{name: "vec2", type: "vec2"},
				{name: "vec3", type: "vec3"},
				{name: "vec4", type: "vec4"},
				{name: "numHidden", type: "number"},
				{name: "vec2Hidden", type: "vec2"},
				{name: "vec3Hidden", type: "vec3"},
				{name: "vec4Hidden", type: "vec4"},
				{name: "numWithSetDefault", type: "number"},
				{name: "vec2withSetDefault", type: "vec2"},
				{name: "vec3withSetDefault", type: "vec3"},
				{name: "vec4withSetDefault", type: "vec4"},
				{name: "numWithDefaultDefault", type: "number", defaultValue: 1},
				{name: "vec2withDefaultDefault", type: "vec2", defaultValue: new Vec2(1, 2)},
				{name: "vec3withDefaultDefault", type: "vec3", defaultValue: new Vec3(1, 2, 3)},
				{name: "vec4withDefaultDefault", type: "vec4", defaultValue: new Vec4(1, 2, 3, 4)},
				{name: "numAllDefault", type: "number"},
				{name: "vec2AllDefault", type: "vec2"},
				{name: "vec2AllDefaultWithDefaultDefault", type: "vec2", defaultValue: new Vec2(1, 2)},
				{name: "texture2d", type: "texture2d"},
				{name: "sampler", type: "sampler"},
			];
			return values;
		});

		const {liveAsset} = await projectAssetType.getLiveAssetData({
			maps: [
				{
					mapTypeId: BASIC_MATERIAL_MAP_TYPE_ID,
					customData,
					mappedValues: {
						num: {
							mappedName: "mappedNum",
						},
						vec2: {
							mappedName: "mappedVec2",
						},
						vec3: {
							mappedName: "mappedVec3",
						},
						vec4: {
							mappedName: "mappedVec4",
						},
						numHidden: {
							visible: false,
						},
						vec2Hidden: {
							visible: false,
						},
						vec3Hidden: {
							visible: false,
						},
						vec4Hidden: {
							visible: false,
						},
						numWithSetDefault: {
							mappedName: "mappedNumWithSetDefault",
							defaultValue: 1,
						},
						vec2withSetDefault: {
							mappedName: "mappedVec2withSetDefault",
							defaultValue: new Vec2(1, 2),
						},
						vec3withSetDefault: {
							mappedName: "mapVec3withSetDefault",
							defaultValue: new Vec3(1, 2, 3),
						},
						vec4withSetDefault: {
							mappedName: "mappedVec4withSetDefault",
							defaultValue: new Vec4(1, 2, 3, 4),
						},
						numWithDefaultDefault: {
							mappedName: "mappedNumWithDefaultDefault",
						},
						vec2withDefaultDefault: {
							mappedName: "mappedVec2withDefaultDefault",
						},
						vec3withDefaultDefault: {
							mappedName: "mapVec3withDefaultDefault",
						},
						vec4withDefaultDefault: {
							mappedName: "mappedVec4withDefaultDefault",
						},
						// numAllDefault, vec2AllDefault and vec2AllDefaultWithDefaultDefault are deliberately
						// missing when all values have the default value
						texture2d: {
							defaultValue: BASIC_TEXTURE_UUID,
						},
						sampler: {
							defaultValue: BASIC_SAMPLER_UUID,
						},
					},
				},
			],
		}, recursionTracker);
		assertInstanceOf(liveAsset, MaterialMap);
		const mapTypeInstance = liveAsset.getMapTypeInstance(ExtendedMaterialMapType);
		assertInstanceOf(mapTypeInstance, ExtendedMaterialMapType);
		assertEquals(mapTypeInstance.customData, customData);
		const mappedDatas = Array.from(liveAsset.getMappedDatasForMapType(ExtendedMaterialMapType));
		assertEquals(mappedDatas, [
			{
				mappedName: "num",
				mappedType: "number",
				defaultValue: 0,
			},
			{
				mappedName: "vec2",
				mappedType: "vec2",
				defaultValue: new Vec2(0, 0),
			},
			{
				mappedName: "vec3",
				mappedType: "vec3",
				defaultValue: new Vec3(0, 0, 0),
			},
			{
				mappedName: "vec4",
				mappedType: "vec4",
				defaultValue: new Vec4(0, 0, 0, 1),
			},
			// hidden variables should not be included
			{
				mappedName: "numWithSetDefault",
				mappedType: "number",
				defaultValue: 1,
			},
			{
				mappedName: "vec2withSetDefault",
				mappedType: "vec2",
				defaultValue: new Vec2(1, 2),
			},
			{
				mappedName: "vec3withSetDefault",
				mappedType: "vec3",
				defaultValue: new Vec3(1, 2, 3),
			},
			{
				mappedName: "vec4withSetDefault",
				mappedType: "vec4",
				defaultValue: new Vec4(1, 2, 3, 4),
			},
			{
				mappedName: "numWithDefaultDefault",
				mappedType: "number",
				defaultValue: 1,
			},
			{
				mappedName: "vec2withDefaultDefault",
				mappedType: "vec2",
				defaultValue: new Vec2(1, 2),
			},
			{
				mappedName: "vec3withDefaultDefault",
				mappedType: "vec3",
				defaultValue: new Vec3(1, 2, 3),
			},
			{
				mappedName: "vec4withDefaultDefault",
				mappedType: "vec4",
				defaultValue: new Vec4(1, 2, 3, 4),
			},
			{
				mappedName: "numAllDefault",
				mappedType: "number",
				defaultValue: 0,
			},
			{
				mappedName: "vec2AllDefault",
				mappedType: "vec2",
				defaultValue: new Vec2(0, 0),
			},
			{
				mappedName: "vec2AllDefaultWithDefaultDefault",
				mappedType: "vec2",
				defaultValue: new Vec2(1, 2),
			},
			{
				mappedName: "texture2d",
				mappedType: "texture2d",
				defaultValue: textureLiveAsset,
			},
			{
				mappedName: "sampler",
				mappedType: "sampler",
				defaultValue: samplerLiveAsset,
			},
		]);
		const textureMappedDatas = Array.from(liveAsset.mapProperty("texture2d"));
		assertStrictEquals(textureMappedDatas[0][1].defaultValue, textureLiveAsset);
		const samplerMappedDatas = Array.from(liveAsset.mapProperty("sampler"));
		assertStrictEquals(samplerMappedDatas[0][1].defaultValue, samplerLiveAsset);
	},
});

Deno.test({
	name: "saveLiveAssetData() with null",
	async fn() {
		const {projectAssetType} = basicSetup();

		const assetData = await projectAssetType.saveLiveAssetData(null, null);

		assertEquals(assetData, null);
	},
});

Deno.test({
	name: "saveLiveAssetData() with material map without maps",
	async fn() {
		const {projectAssetType} = basicSetup();
		const liveAsset = new MaterialMap();

		const assetData = await projectAssetType.saveLiveAssetData(liveAsset, null);

		assertEquals(assetData, null);
	},
});

Deno.test({
	name: "saveLiveAssetData() with material map with one map",
	async fn() {
		const {projectAssetType, ExtendedMaterialMapType, UnregisteredExtendedMaterialMapType} = basicSetup();
		const registeredMapType = new ExtendedMaterialMapType();
		const unregisteredMapType = new UnregisteredExtendedMaterialMapType();
		/** @type {import("../../../../../../src/rendering/MaterialMap.js").MaterialMapTypeData[]} */
		const materialMapTypes = [
			{
				mapType: registeredMapType,
				mappedValues: {},
			},
			{
				mapType: unregisteredMapType, // this is not registered so it should not appear in the saved data.
				mappedValues: {},
			},
		];
		const liveAsset = new MaterialMap({materialMapTypes});

		const assetData = await projectAssetType.saveLiveAssetData(liveAsset, null);

		assertEquals(assetData, {
			maps: [
				{
					mapTypeId: BASIC_MATERIAL_MAP_TYPE_ID,
					customData: {label: "material map type custom data"},
				},
			],
		});
	},
});

/**
 * @param {Object} options
 * @param {typeof MaterialMapTypeLoader} options.ExtendedMaterialMapTypeLoader
 * @param {import("../../../../../../src/mod.js").AssetLoader["getAsset"]} [options.getAssetFn]
 */
function createBasicMaterialMapLoader({ExtendedMaterialMapTypeLoader, getAssetFn}) {
	const mockAssetLoader = /** @type {import("../../../../../../src/mod.js").AssetLoader} */ ({
		getAsset: getAssetFn || (async () => {}),
	});
	const materialMapLoader = new AssetLoaderTypeMaterialMap(mockAssetLoader);
	materialMapLoader.registerMaterialMapTypeLoader(ExtendedMaterialMapTypeLoader);
	return materialMapLoader;
}

Deno.test({
	name: "createBundledAssetData()",
	async fn() {
		const {projectAssetType, editor, assetManager, ExtendedMaterialMapTypeSerializer, ExtendedMaterialMapTypeLoader, MapType} = basicSetup({
			readAssetDataReturnValue: {
				maps: [
					{
						mapTypeId: BASIC_MATERIAL_MAP_TYPE_ID,
						customData: {
							foo: "bar",
						},
						mappedValues: {
							num: {
								mappedName: "mappedNum",
								defaultValue: 42,
							},
							v2: {
								defaultValue: [4, 2],
							},
							v3: {
								defaultValue: [5, 6, 7],
							},
							v4: {
								mappedName: "mappedV4",
							},
							samp: {
								mappedName: "mappedSamp",
							},
						},
					},
				],
			},
		});
		const mapDataToAssetBundleBinarySpy = spy(ExtendedMaterialMapTypeSerializer, "mapDataToAssetBundleBinary");

		const buffer = await projectAssetType.createBundledAssetData();

		assertSpyCalls(mapDataToAssetBundleBinarySpy, 1);
		assertSpyCall(mapDataToAssetBundleBinarySpy, 0, {
			args: [
				editor,
				assetManager,
				{foo: "bar"},
			],
		});

		assertInstanceOf(buffer, ArrayBuffer);

		const materialMapLoader = createBasicMaterialMapLoader({ExtendedMaterialMapTypeLoader});
		const materialMap = await materialMapLoader.parseBuffer(buffer);
		assertEquals(materialMap.mapTypes.size, 1);
		const mapTypeInstance = materialMap.getMapTypeInstance(MapType);
		assertInstanceOf(mapTypeInstance, MapType);
		const mappedDatas = Array.from(materialMap.getMappedDatasForMapType(MapType));
		assertEquals(mappedDatas, [
			{
				mappedName: "num",
				mappedType: "number",
				defaultValue: 42,
			},
			{
				mappedName: "v2",
				mappedType: "vec2",
				defaultValue: new Vec2(4, 2),
			},
			{
				mappedName: "v3",
				mappedType: "vec3",
				defaultValue: new Vec3(5, 6, 7),
			},
			{
				mappedName: "v4",
				mappedType: "vec4",
				defaultValue: new Vec4(1, 2, 3, 4),
			},
			{
				mappedName: "noDefault",
				mappedType: "vec3",
				defaultValue: new Vec3(0, 0, 0),
			},
			{
				mappedName: "samp",
				mappedType: "sampler",
				defaultValue: null,
			},
			{
				mappedName: "tex",
				mappedType: "texture2d",
				defaultValue: null,
			},
		]);

		const mappedNumProperty = Array.from(materialMap.mapProperty("mappedNum"));
		assertEquals(mappedNumProperty, [
			[
				MapType,
				{mappedName: "num", defaultValue: 42, mappedType: "number"},
			],
		]);
		const mappedV4Property = Array.from(materialMap.mapProperty("mappedV4"));
		assertEquals(mappedV4Property, [
			[
				MapType,
				{mappedName: "v4", defaultValue: new Vec4(1, 2, 3, 4), mappedType: "vec4"},
			],
		]);
	},
});

Deno.test({
	name: "Bundled asset data with color texture",
	async fn() {
		const {projectAssetType, projectAsset, ExtendedMaterialMapTypeLoader, MapType} = basicSetup({
			mappableValues: [
				{
					name: "tex",
					type: "texture2d",
				},
			],
		});
		stub(projectAsset, "readAssetData", async () => {
			const MAP_TYPE_ID = BASIC_MATERIAL_MAP_TYPE_ID;
			/** @type {import("../../../../../../editor/src/assets/MaterialMapTypeSerializerManager.js").MaterialMapAssetData} */
			const result = {
				maps: [
					{
						mapTypeId: MAP_TYPE_ID,
						mappedValues: {
							tex: {
								defaultValue: [1, 2, 3, 4],
							},
						},
					},
				],
			};
			return result;
		});

		const buffer = await projectAssetType.createBundledAssetData();
		assertInstanceOf(buffer, ArrayBuffer);

		const materialMapLoader = createBasicMaterialMapLoader({ExtendedMaterialMapTypeLoader});
		const materialMap = await materialMapLoader.parseBuffer(buffer);
		const mappedDatas = Array.from(materialMap.getMappedDatasForMapType(MapType));
		assertEquals(mappedDatas, [
			{
				mappedName: "tex",
				mappedType: "texture2d",
				defaultValue: new Vec4(1, 2, 3, 4),
			},
		]);
	},
});

Deno.test({
	name: "createBundledAssetData() with referenced assets",
	async fn() {
		const sampler = new Sampler();
		const texture = new Texture(new Blob());
		const {projectAssetType, assetManager, ExtendedMaterialMapTypeLoader, MapType} = basicSetup({
			mappableValues: [
				{
					name: "samp",
					type: "sampler",
				},
				{
					name: "tex",
					type: "texture2d",
				},
			],
			readAssetDataReturnValue: {
				maps: [
					{
						mapTypeId: BASIC_MATERIAL_MAP_TYPE_ID,
						mappedValues: {
							samp: {
								defaultValue: BASIC_SAMPLER_UUID,
							},
							tex: {
								defaultValue: BASIC_TEXTURE_UUID,
							},
						},
					},
				],
			},
		});
		stub(assetManager, "getLiveAsset", async uuid => {
			if (uuid == BASIC_SAMPLER_UUID) {
				return sampler;
			} else if (uuid == BASIC_TEXTURE_UUID) {
				return texture;
			}
		});

		const buffer = await projectAssetType.createBundledAssetData();
		assertInstanceOf(buffer, ArrayBuffer);

		const materialMapLoader = createBasicMaterialMapLoader({
			ExtendedMaterialMapTypeLoader,
			async getAssetFn(uuid) {
				if (uuid == BASIC_SAMPLER_UUID) {
					return sampler;
				} else if (uuid == BASIC_TEXTURE_UUID) {
					return texture;
				}
			},
		});
		const materialMap = await materialMapLoader.parseBuffer(buffer);
		const mappedDatas = Array.from(materialMap.getMappedDatasForMapType(MapType));
		assertEquals(mappedDatas, [
			{
				mappedName: "samp",
				mappedType: "sampler",
				defaultValue: sampler,
			},
			{
				mappedName: "tex",
				mappedType: "texture2d",
				defaultValue: texture,
			},
		]);
	},
});

Deno.test({
	name: "getReferencedAssetUuids()",
	async fn() {
		const duplicateSampler = new Sampler();
		const {projectAssetType, ExtendedMaterialMapTypeSerializer} = basicSetup({
			extraMappableValues: [
				{
					name: "duplicate",
					type: "sampler",
					defaultValue: duplicateSampler,
				},
			],
			readAssetDataReturnValue: {
				maps: [
					{
						mapTypeId: BASIC_MATERIAL_MAP_TYPE_ID,
						customData: {
							foo: "bar",
						},
						mappedValues: {
							samp: {
								mappedName: "mappedSamp",
								defaultValue: BASIC_SAMPLER_UUID,
							},
							duplicate: {
								mappedName: "mappedDuplicate",
								defaultValue: DUPLICATE_REFERENCED_ASSET_UUID,
							},
						},
					},
				],
			},
		});
		const getReferencedAssetUuidsSpy = spy(ExtendedMaterialMapTypeSerializer, "getReferencedAssetUuids");

		const result = [];
		for await (const uuid of projectAssetType.getReferencedAssetUuids()) {
			result.push(uuid);
		}
		assertEquals(result, [
			BASIC_SAMPLER_UUID,
			DUPLICATE_REFERENCED_ASSET_UUID,
			MAP_TYPE_REFERENCED_ASSET_UUID,
			// Duplicate asset uuids are filtered when bundling, so there's no
			// need to filter them here.
			DUPLICATE_REFERENCED_ASSET_UUID,
		]);

		assertSpyCalls(getReferencedAssetUuidsSpy, 1);
		assertSpyCall(getReferencedAssetUuidsSpy, 0, {
			args: [{foo: "bar"}],
		});
	},
});
