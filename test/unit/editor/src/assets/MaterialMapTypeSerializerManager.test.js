import {assert, assertEquals, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {MaterialMapTypeSerializer} from "../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js";
import {MaterialMapTypeSerializerManager} from "../../../../../editor/src/assets/MaterialMapTypeSerializerManager.js";
import {injectMockEditorInstance} from "../../../../../editor/src/editorInstance.js";
import {createMockProjectAsset} from "./shared/createMockProjectAsset.js";
import {assertSpyCall, assertSpyCalls, mockSessionAsync, spy, stub} from "std/testing/mock.ts";

const BASIC_SERIALIZER_UUID = "ba51c000-0000-0000-0000-5e71a112e700";
const BASIC_MATERIAL_MAP_ASSET_UUID = "basic material map asset uuid";
const NON_EXISTENT_MATERIAL_MAP_ASSET_UUID = "non existent material map asset uuid";

class LiveAssetConstructor {}

class ExtendedMaterialMapTypeSerializer extends MaterialMapTypeSerializer {
	static uiName = "serializer";
	static typeUuid = BASIC_SERIALIZER_UUID;
	static expectedLiveAssetConstructor = LiveAssetConstructor;

	/** @type {import("../../../../../editor/src/ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} */
	static settingsStructure = {
		foo: {
			type: "number",
		},
	};

	/**
	 * @override
	 * @param {import("../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapLiveAssetDataContext} context
	 * @param {*} customData The customData as stored on disk.
	 * @returns {Promise<import("../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue[]>}
	 */
	static async getMappableValues(context, customData) {
		return [
			{
				name: "foo",
				type: "number",
				defaultValue: 3,
			},
		];
	}
}

Deno.test({
	name: "init(), registers the default serializers",
	fn() {
		const manager = new MaterialMapTypeSerializerManager();
		manager.init();

		const types = Array.from(manager.getAllTypes());
		assert(types.length > 0, "manager has no loaded serializers");
	},
});

Deno.test({
	name: "registering a serializer with an incorrect constructor type throws",
	fn() {
		const manager = new MaterialMapTypeSerializerManager();

		assertThrows(() => {
			manager.registerMapType(/** @type {any} */ ({}));
		}, Error, "Tried to register a MaterialMapType type (undefined) that does not extend MaterialMapType class.");
	},
});

Deno.test({
	name: "registering a serializer with a missing 'uiName' property throws",
	fn() {
		const manager = new MaterialMapTypeSerializerManager();

		class ExtendedMaterialMapTypeSerializer extends MaterialMapTypeSerializer {}
		assertThrows(() => {
			manager.registerMapType(ExtendedMaterialMapTypeSerializer);
		}, Error, `Failed to register MaterialMapType "ExtendedMaterialMapTypeSerializer", invalid uiName value: ""`);
	},
});

Deno.test({
	name: "registering a serializer with a missing typeUuid throws",
	fn() {
		const manager = new MaterialMapTypeSerializerManager();

		class ExtendedMaterialMapTypeSerializer extends MaterialMapTypeSerializer {
			static uiName = "serializer";
		}
		assertThrows(() => {
			manager.registerMapType(ExtendedMaterialMapTypeSerializer);
		}, Error, `Failed to register MaterialMapType "ExtendedMaterialMapTypeSerializer", invalid typeUuid value: ""`);
	},
});

Deno.test({
	name: "registering a serializer with an invalid typeUuid throws",
	fn() {
		const manager = new MaterialMapTypeSerializerManager();

		class ExtendedMaterialMapTypeSerializer extends MaterialMapTypeSerializer {
			static uiName = "serializer";
			static typeUuid = "invalid";
		}
		assertThrows(() => {
			manager.registerMapType(ExtendedMaterialMapTypeSerializer);
		}, Error, `Failed to register MaterialMapType "ExtendedMaterialMapTypeSerializer", invalid typeUuid value: "invalid"`);
	},
});

Deno.test({
	name: "registering a serializer with neither a settingsStructure nor a propertiesMaterialMapContentConstructor throws",
	fn() {
		const manager = new MaterialMapTypeSerializerManager();

		class ExtendedMaterialMapTypeSerializer extends MaterialMapTypeSerializer {
			static uiName = "serializer";
			static typeUuid = BASIC_SERIALIZER_UUID;
		}
		assertThrows(() => {
			manager.registerMapType(ExtendedMaterialMapTypeSerializer);
		}, Error, `Failed to register MaterialMapType "ExtendedMaterialMapTypeSerializer", the type needs to have either a settingsStructure or a propertiesMaterialMapContentConstructor set.`);
	},
});

Deno.test({
	name: "getTypeByUuid()",
	fn() {
		const manager = new MaterialMapTypeSerializerManager();
		manager.registerMapType(ExtendedMaterialMapTypeSerializer);

		const result = manager.getTypeByUuid(BASIC_SERIALIZER_UUID);

		assertStrictEquals(result, ExtendedMaterialMapTypeSerializer);
	},
});

Deno.test({
	name: "getTypeByLiveAssetConstructor()",
	fn() {
		const manager = new MaterialMapTypeSerializerManager();
		manager.registerMapType(ExtendedMaterialMapTypeSerializer);

		const result = manager.getTypeByLiveAssetConstructor(LiveAssetConstructor);

		assertStrictEquals(result, ExtendedMaterialMapTypeSerializer);
	},
});

Deno.test({
	name: "getTypeByLiveAssetConstructor() returns null when it doesn't exist",
	fn() {
		const manager = new MaterialMapTypeSerializerManager();

		const result = manager.getTypeByLiveAssetConstructor(LiveAssetConstructor);

		assertStrictEquals(result, null);
	},
});

/**
 * @param {object} options
 * @param {import("../../../../../editor/src/assets/MaterialMapTypeSerializerManager.js").MaterialMapAssetData} [options.mapReadAssetDataReturnValue]
 */
function basicGetMapValuesForMapAssetUuidSetup({
	mapReadAssetDataReturnValue = {},
} = {}) {
	const {projectAsset: mockMaterialMapProjectAsset} = createMockProjectAsset({
		readAssetDataReturnValue: mapReadAssetDataReturnValue,
	});
	const mockProjectAssetType = /** @type {import("../../../../../editor/src/assets/projectAssetType/ProjectAssetTypeMaterialMap.js").ProjectAssetTypeMaterialMap} */ ({
		createLiveAssetDataContext() {
			return /** @type {any} */ ({
				label: "live asset data context",
			});
		},
	});
	stub(mockMaterialMapProjectAsset, "getProjectAssetType", async () => {
		return mockProjectAssetType;
	});
	const mockAssetManager = /** @type {import("../../../../../editor/src/assets/AssetManager.js").AssetManager} */ ({
		async getProjectAssetFromUuid(uuid) {
			if (uuid === BASIC_MATERIAL_MAP_ASSET_UUID) {
				return mockMaterialMapProjectAsset;
			}
			return null;
		},
	});

	const mockEditor = /** @type {import("../../../../../editor/src/Editor.js").Editor} */ ({
		projectManager: {
			async getAssetManager() {
				return mockAssetManager;
			},
			assetManager: mockAssetManager,
		},
	});
	injectMockEditorInstance(mockEditor);

	const manager = new MaterialMapTypeSerializerManager();
	manager.registerMapType(ExtendedMaterialMapTypeSerializer);

	return {
		manager,
	};
}

Deno.test({
	name: "getMapValuesForMapAssetUuid(), no map uuid provided",
	async fn() {
		const {manager} = basicGetMapValuesForMapAssetUuidSetup();
		const result = await manager.getMapValuesForMapAssetUuid(null);
		assertEquals(result, []);
	},
});

Deno.test({
	name: "getMapValuesForMapAssetUuid(), map doesn't exist",
	async fn() {
		const {manager} = basicGetMapValuesForMapAssetUuidSetup();
		const result = await manager.getMapValuesForMapAssetUuid(NON_EXISTENT_MATERIAL_MAP_ASSET_UUID);
		assertEquals(result, []);
	},
});

Deno.test({
	name: "getMapValuesForMapAssetUuid(), map has no map types",
	async fn() {
		const {manager} = basicGetMapValuesForMapAssetUuidSetup({
			mapReadAssetDataReturnValue: {
				maps: [],
			},
		});
		const result = await manager.getMapValuesForMapAssetUuid(BASIC_MATERIAL_MAP_ASSET_UUID);
		assertEquals(result, []);
	},
});

Deno.test({
	name: "getMapValuesForMapAssetUuid(), basic map type data",
	async fn() {
		await mockSessionAsync(async () => {
			const getMappedValuesSpy = spy(ExtendedMaterialMapTypeSerializer, "getMappedValues");
			const {manager} = basicGetMapValuesForMapAssetUuidSetup({
				mapReadAssetDataReturnValue: {
					maps: [
						{
							mapTypeId: BASIC_SERIALIZER_UUID,
							mappedValues: {
								foo: {
									defaultValue: 6,
									mappedName: "mappedFoo",
									visible: true,
								},
							},
							customData: {label: "map custom data"},
						},
					],
				},
			});
			const result = await manager.getMapValuesForMapAssetUuid(BASIC_MATERIAL_MAP_ASSET_UUID);
			assertEquals(result, [
				{
					name: "mappedFoo",
					type: "number",
					defaultValue: 6,
				},
			]);
			assertSpyCalls(getMappedValuesSpy, 1);
			assertSpyCall(getMappedValuesSpy, 0, {
				args: [
					/** @type {any} */({label: "live asset data context"}),
					{label: "map custom data"},
					{
						foo: {
							defaultValue: 6,
							mappedName: "mappedFoo",
							visible: true,
						},
					},
				],
			});
		})();
	},
});

Deno.test({
	name: "getMapValuesForMapAssetUuid(), missing default value",
	async fn() {
		const {manager} = basicGetMapValuesForMapAssetUuidSetup({
			mapReadAssetDataReturnValue: {
				maps: [
					{
						mapTypeId: BASIC_SERIALIZER_UUID,
						mappedValues: {
							foo: {
								mappedName: "mappedFoo",
								visible: true,
							},
						},
					},
				],
			},
		});
		const result = await manager.getMapValuesForMapAssetUuid(BASIC_MATERIAL_MAP_ASSET_UUID);
		assertEquals(result, [
			{
				name: "mappedFoo",
				type: "number",
				defaultValue: 3,
			},
		]);
	},
});

Deno.test({
	name: "getMapValuesForMapAssetUuid(), missing mapped values",
	async fn() {
		const {manager} = basicGetMapValuesForMapAssetUuidSetup({
			mapReadAssetDataReturnValue: {
				maps: [
					{
						mapTypeId: BASIC_SERIALIZER_UUID,
					},
				],
			},
		});
		const result = await manager.getMapValuesForMapAssetUuid(BASIC_MATERIAL_MAP_ASSET_UUID);
		assertEquals(result, [
			{
				name: "foo",
				type: "number",
				defaultValue: 3,
			},
		]);
	},
});
