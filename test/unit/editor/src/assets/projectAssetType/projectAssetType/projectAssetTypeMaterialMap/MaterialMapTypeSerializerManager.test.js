import {assert, assertStrictEquals, assertThrows} from "asserts";
import {MaterialMapTypeSerializer} from "../../../../../../../../editor/src/assets/projectAssetType/projectAssetTypeMaterialMap/materialMapTypes/MaterialMapTypeSerializer.js";
import {MaterialMapTypeSerializerManager} from "../../../../../../../../editor/src/assets/projectAssetType/projectAssetTypeMaterialMap/MaterialMapTypeSerializerManager.js";

const BASIC_SERIALIZER_UUID = "00000000-0000-0000-0000-000000000000";

class ExtendedMaterialMapTypeSerializer extends MaterialMapTypeSerializer {
	static uiName = "serializer";
	static typeUuid = BASIC_SERIALIZER_UUID;

	/** @type {import("../../../../../../../../editor/src/ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} */
	static settingsStructure = {
		foo: {
			type: "number",
		},
	};
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
