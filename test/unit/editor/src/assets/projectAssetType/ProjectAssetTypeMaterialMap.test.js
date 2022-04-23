import {assertEquals} from "std/testing/asserts";
import "../../../shared/initializeEditor.js";
import {MaterialMapProjectAssetType} from "../../../../../../editor/src/assets/projectAssetType/MaterialMapProjectAssetType.js";
import {MaterialMap} from "../../../../../../src/rendering/MaterialMap.js";
import {createMockDependencies} from "./shared.js";
import {MaterialMapType} from "../../../../../../src/rendering/MaterialMapType.js";
import {MaterialMapTypeSerializer} from "../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js";

const BASIC_MATERIAL_MAP_TYPE_ID = "basic material map type id";

function basicSetup() {
	const {projectAssetTypeArgs, editor} = createMockDependencies();

	class ExtendedMaterialMapTypeSerializer extends MaterialMapTypeSerializer {
		static typeUuid = BASIC_MATERIAL_MAP_TYPE_ID;
		/**
		 * @override
		 * @param {import("../../../../../../editor/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapLiveAssetDataContext} context
		 * @param {any} liveAsset
		 */
		static async saveLiveAssetData(context, liveAsset) {
			return {label: "material map type custom data"};
		}
	}
	class ExtendedMaterialMapType extends MaterialMapType {}
	class UnregisteredExtendedMaterialMapType extends MaterialMapType {}

	editor.materialMapTypeSerializerManager = /** @type {import("../../../../../../editor/src/assets/MaterialMapTypeSerializerManager.js").MaterialMapTypeSerializerManager} */ ({
		getTypeByLiveAssetConstructor(mapConstructor) {
			if (mapConstructor == ExtendedMaterialMapType) return ExtendedMaterialMapTypeSerializer;
			return null;
		},
	});
	const projectAssetType = new MaterialMapProjectAssetType(...projectAssetTypeArgs);

	return {
		projectAssetType,
		ExtendedMaterialMapTypeSerializer,
		ExtendedMaterialMapType,
		UnregisteredExtendedMaterialMapType,
	};
}

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
