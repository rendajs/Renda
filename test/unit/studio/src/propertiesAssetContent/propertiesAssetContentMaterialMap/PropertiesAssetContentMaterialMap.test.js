import { Importer } from "fake-imports";
import { createMockProjectAsset } from "../../../shared/createMockProjectAsset.js";
import { assertEquals, assertExists, assertStrictEquals } from "std/testing/asserts.ts";

const importer = new Importer(import.meta.url, {
	importMap: "../../../../../../importmap.json",
});
importer.redirectModule("../../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeView.js", "../../../shared/mockTreeView/PropertiesTreeView.js");
importer.fakeModule("../../../../../../studio/src/propertiesAssetContent/propertiesAssetContentMaterialMap/MaterialMapTypeEntry.js", `
	export class MaterialMapTypeEntry {
		constructor(studioInstance, typeConstructor) {
			this.typeConstructor = typeConstructor;
		}
		onValueChange() {}
		customAssetDataFromLoad() {}
		updateMapListUi() {}
		selectedAssetsUpdated() {}
	}
`);

/** @type {import("../../../../../../studio/src/propertiesAssetContent/propertiesAssetContentMaterialMap/PropertiesAssetContentMaterialMap.js")} */
const PropertiesAssetContentMaterialMapImport = await importer.import("../../../../../../studio/src/propertiesAssetContent/propertiesAssetContentMaterialMap/PropertiesAssetContentMaterialMap.js");
const { PropertiesAssetContentMaterialMap } = PropertiesAssetContentMaterialMapImport;

const BASIC_MAP_TYPE_UUID = "basic-map-type-uuid";

function basicSetup() {
	class MockMaterialMapTypeSerializer {
		static typeUuid = BASIC_MAP_TYPE_UUID;
	}

	const mockStudio = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({
		materialMapTypeSerializerManager: {
			getTypeByUuid(uuid) {
				return MockMaterialMapTypeSerializer;
			},
		},
	});

	const assetContent = new PropertiesAssetContentMaterialMap(mockStudio);

	return {
		assetContent,
		MockMaterialMapTypeSerializer,
	};
}

Deno.test({
	name: "Load an empty material map",
	async fn() {
		const { assetContent } = basicSetup();
		const { projectAsset: mockMaterialMapAsset } = createMockProjectAsset({
			readAssetDataReturnValue: {},
		});

		await assetContent.selectionUpdated([mockMaterialMapAsset]);

		assertEquals(assetContent.mapTypesTreeView.children.length, 0);
		assertEquals(assetContent.addedMapTypes.size, 0);
	},
});

Deno.test({
	name: "Load a material map with one map",
	async fn() {
		const { assetContent, MockMaterialMapTypeSerializer } = basicSetup();
		const { projectAsset: mockMaterialMapAsset } = createMockProjectAsset({
			readAssetDataReturnValue: {
				maps: [
					{
						mapTypeId: BASIC_MAP_TYPE_UUID,
						customData: { custom: "data" },
					},
				],
			},
		});

		await assetContent.selectionUpdated([mockMaterialMapAsset]);

		assertEquals(assetContent.mapTypesTreeView.children.length, 1);
		assertEquals(assetContent.addedMapTypes.size, 1);
		const addedEntry = assetContent.addedMapTypes.get(BASIC_MAP_TYPE_UUID);
		assertExists(addedEntry);
		assertStrictEquals(addedEntry.typeConstructor, MockMaterialMapTypeSerializer);
	},
});
