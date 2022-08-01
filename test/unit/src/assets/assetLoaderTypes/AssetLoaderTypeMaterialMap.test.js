import {assertThrows} from "std/testing/asserts.ts";
import {AssetLoaderTypeMaterialMap, MaterialMapTypeLoader} from "../../../../../src/mod.js";

const mockAssetLoader = /** @type {import("../../../../../src/assets/AssetLoader.js").AssetLoader} */ ({});

Deno.test({
	name: "registering material map type that is not an instance of MaterialMapTypeLoader shouuld throw",
	fn() {
		class Foo {}
		const assetLoader = new AssetLoaderTypeMaterialMap(mockAssetLoader);
		assertThrows(() => {
			assetLoader.registerMaterialMapTypeLoader(/** @type {any} */(Foo));
		}, Error, `Unable to register MaterialMapTypeLoader "Foo" because it doesn't extend the MaterialMapTypeLoader class.`);
	},
});

Deno.test({
	name: "registering material map type that is missing a typeUuid property should throw",
	fn() {
		class Foo extends MaterialMapTypeLoader {}
		const assetLoader = new AssetLoaderTypeMaterialMap(mockAssetLoader);
		assertThrows(() => {
			assetLoader.registerMaterialMapTypeLoader(Foo);
		}, Error, `Unable to register MaterialMapTypeLoader "Foo" because it doesn't have a valid uuid for the static 'typeUuid' set ("").`);
	},
});

Deno.test({
	name: "registering material map type that has an invalid typeUuid property should throw",
	fn() {
		class Foo extends MaterialMapTypeLoader {
			static get typeUuid() {
				return "not a uuid";
			}
		}
		const assetLoader = new AssetLoaderTypeMaterialMap(mockAssetLoader);
		assertThrows(() => {
			assetLoader.registerMaterialMapTypeLoader(Foo);
		}, Error, `Unable to register MaterialMapTypeLoader "Foo" because it doesn't have a valid uuid for the static 'typeUuid' set ("not a uuid").`);
	},
});
