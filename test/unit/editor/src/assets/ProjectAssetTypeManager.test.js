import {assertEquals, assertExists, assertStrictEquals, assertThrows} from "std/testing/asserts";
import "../../shared/initializeEditor.js";
import {ProjectAssetTypeManager} from "../../../../../editor/src/assets/ProjectAssetTypeManager.js";
import {ProjectAssetType} from "../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js";

const BASIC_UUID = "00000000-0000-0000-0000-000000000000";
const BASIC_UUID2 = "00000000-0000-0000-0000-000000000001";
const BASIC_ASSET_TYPE = "namespace:type";
const BASIC_ASSET_TYPE2 = "namespace:type2";

/** @extends {ProjectAssetType<any, any, any, any>} */
class ExtendedProjectAssetType extends ProjectAssetType {
	static type = BASIC_ASSET_TYPE;
	static typeUuid = BASIC_UUID;
}

Deno.test({
	name: "init(), registers the default asset types",
	fn() {
		const manager = new ProjectAssetTypeManager();
		manager.init();

		const result = manager.getAssetType("JJ:mesh");

		assertExists(result);
	},
});

Deno.test({
	name: "registering an asset type with an incorrect constructor type throws",
	fn() {
		const manager = new ProjectAssetTypeManager();

		assertThrows(() => {
			manager.registerAssetType(/** @type {any} */ ({}));
		}, Error, "Tried to register project asset type (undefined) that does not extend ProjectAssetType class.");
	},
});

Deno.test({
	name: "registering an asset type with a missing 'type' property throws",
	fn() {
		const manager = new ProjectAssetTypeManager();

		/** @extends {ProjectAssetType<any, any, any, any>} */
		class ExtendedProjectAssetType extends ProjectAssetType {}

		assertThrows(() => {
			manager.registerAssetType(ExtendedProjectAssetType);
		}, Error, "Tried to register project asset type (ExtendedProjectAssetType) with no type value, override the static type value in order for this asset type to function properly.");
	},
});

Deno.test({
	name: "registering an asset type with an incorrect 'type' format throws",
	fn() {
		const manager = new ProjectAssetTypeManager();

		const wrongTypes = [
			"missingcolon",
			":nonamespace",
			// "notype:",
		];

		for (const typeStr of wrongTypes) {
			/** @extends {ProjectAssetType<any, any, any, any>} */
			class ExtendedProjectAssetType extends ProjectAssetType {
				static type = typeStr;
				static typeUuid = BASIC_UUID;
			}

			assertThrows(() => {
				manager.registerAssetType(ExtendedProjectAssetType);
			}, Error, "Tried to register project asset type (ExtendedProjectAssetType) without a namespace in the type value.");
		}
	},
});

Deno.test({
	name: "registering an asset type with a missing 'typeUuid' property throws",
	fn() {
		const manager = new ProjectAssetTypeManager();

		const wrongUuids = [
			null,
			"not an uuid",
			"also-not-an-uuid",
		];

		for (const wrongUuid of wrongUuids) {
			/** @extends {ProjectAssetType<any, any, any, any>} */
			class ExtendedProjectAssetType extends ProjectAssetType {
				static type = BASIC_ASSET_TYPE;
				static typeUuid = wrongUuid;
			}

			assertThrows(() => {
				manager.registerAssetType(ExtendedProjectAssetType);
			}, Error, "Tried to register project asset type (ExtendedProjectAssetType) without a valid typeUuid, override the static typeUuid value in order for this asset type to function properly.");
		}
	},
});

Deno.test({
	name: "getAssetType() by identifier",
	fn() {
		const manager = new ProjectAssetTypeManager();
		manager.registerAssetType(ExtendedProjectAssetType);

		const result = manager.getAssetType(BASIC_ASSET_TYPE);

		assertStrictEquals(result, ExtendedProjectAssetType);
	},
});

Deno.test({
	name: "getAssetType() by identifier that doesn't exist",
	fn() {
		const manager = new ProjectAssetTypeManager();

		const result = manager.getAssetType(BASIC_ASSET_TYPE);

		assertEquals(result, null);
	},
});

Deno.test({
	name: "getAssetTypeByUuid()",
	fn() {
		const manager = new ProjectAssetTypeManager();
		manager.registerAssetType(ExtendedProjectAssetType);

		const result = manager.getAssetTypeByUuid(BASIC_UUID);

		assertStrictEquals(result, ExtendedProjectAssetType);
	},
});

Deno.test({
	name: "getAssetTypeByUuid() that doesn't exist",
	fn() {
		const manager = new ProjectAssetTypeManager();

		const result = manager.getAssetTypeByUuid(BASIC_UUID);

		assertEquals(result, null);
	},
});

Deno.test({
	name: "getAssetTypesForLiveAssetConstructor()",
	fn() {
		const manager = new ProjectAssetTypeManager();

		class MockConstructor {}

		/** @extends {ProjectAssetType<any, any, any, any>} */
		class AssetType1 extends ProjectAssetType {
			static type = BASIC_ASSET_TYPE;
			static typeUuid = BASIC_UUID;
			static expectedLiveAssetConstructor = MockConstructor;
		}
		manager.registerAssetType(AssetType1);

		/** @extends {ProjectAssetType<any, any, any, any>} */
		class AssetType2 extends ProjectAssetType {
			static type = BASIC_ASSET_TYPE2;
			static typeUuid = BASIC_UUID2;
			static expectedLiveAssetConstructor = MockConstructor;
		}
		manager.registerAssetType(AssetType2);

		const result = Array.from(manager.getAssetTypesForLiveAssetConstructor(MockConstructor));

		assertEquals(result.length, 2);
		assertStrictEquals(result[0], AssetType1);
		assertStrictEquals(result[1], AssetType2);
	},
});

Deno.test({
	name: "constructorHasAssetType true",
	fn() {
		const manager = new ProjectAssetTypeManager();

		class MockConstructor {}

		/** @extends {ProjectAssetType<any, any, any, any>} */
		class AssetType1 extends ProjectAssetType {
			static type = BASIC_ASSET_TYPE;
			static typeUuid = BASIC_UUID;
			static expectedLiveAssetConstructor = MockConstructor;
		}
		manager.registerAssetType(AssetType1);

		const result = manager.constructorHasAssetType(MockConstructor);

		assertEquals(result, true);
	},
});

Deno.test({
	name: "constructorHasAssetType false",
	fn() {
		const manager = new ProjectAssetTypeManager();

		class MockConstructor {}

		const result = manager.constructorHasAssetType(MockConstructor);

		assertEquals(result, false);
	},
});

Deno.test({
	name: "getAssetTypesForExtension()",
	fn() {
		const manager = new ProjectAssetTypeManager();

		/** @extends {ProjectAssetType<any, any, any, any>} */
		class AssetType1 extends ProjectAssetType {
			static type = BASIC_ASSET_TYPE;
			static typeUuid = BASIC_UUID;
			static matchExtensions = ["ext1"];
		}
		manager.registerAssetType(AssetType1);

		/** @extends {ProjectAssetType<any, any, any, any>} */
		class AssetType2 extends ProjectAssetType {
			static type = BASIC_ASSET_TYPE2;
			static typeUuid = BASIC_UUID2;
			static newFileExtension = "ext1";
		}
		manager.registerAssetType(AssetType2);

		const result = Array.from(manager.getAssetTypesForExtension("ext1"));

		assertEquals(result.length, 2);
		assertStrictEquals(result[0], AssetType1);
		assertStrictEquals(result[1], AssetType2);
	},
});
