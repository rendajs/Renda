import "../../../shared/initializeEditor.js";
import {assertEquals, assertStrictEquals} from "asserts";
import {createMockProjectAsset} from "./shared.js";
import {Material} from "../../../../../../src/mod.js";
import {createMockKeyboardShortcutManager} from "../../../shared/mockKeyboardShortcutManager.js";
import {MaterialMap} from "../../../../../../src/rendering/MaterialMap.js";
import {Importer} from "fake-imports";
import {castTreeView} from "../../../shared/mockTreeView/castTreeView.js";

const importer = new Importer(import.meta.url);
importer.fakeModule("../../../../../../editor/src/windowManagement/contentWindows/ContentWindowEntityEditor.js", `
	export class ContentWindowEntityEditor {}
`);
importer.redirectModule("../../../../../../editor/src/ui/propertiesTreeView/PropertiesTreeView.js", "../../../shared/mockTreeView/PropertiesTreeView.js");
importer.fakeModule("../../../../../../src/rendering/MaterialMap.js", `
	export class MaterialMap {}
`);
const {PropertiesAssetContentMaterial} = await importer.import("../../../../../../editor/src/propertiesWindowContent/propertiesAssetContent/PropertiesAssetContentMaterial.js");
await importer.finishCoverageMapWrites();

function basicSetup() {
	const {keyboardShortcutManager} = createMockKeyboardShortcutManager();
	const mockEditorInstance = /** @type {import("../../../../../../editor/src/Editor.js").Editor} */ ({
		keyboardShortcutManager,
		projectManager: {
			assertAssetManagerExists() {
				return {};
			},
		},
	});

	const assetContent = new PropertiesAssetContentMaterial(mockEditorInstance);
	const castAssetContent = /** @type {import("../../../../../../editor/src/propertiesWindowContent/propertiesAssetContent/PropertiesAssetContentMaterial.js").PropertiesAssetContentMaterial} */ (assetContent);
	return {
		assetContent: castAssetContent,
	};
}

Deno.test({
	name: "load material without a material map",
	async fn() {
		const {assetContent} = basicSetup();
		const mockMaterialAsset = createMockProjectAsset({
			liveAsset: new Material(),
		});

		await assetContent.selectionUpdated([mockMaterialAsset]);

		const mockTreeView = castTreeView(assetContent.mapTreeView);
		assertEquals(mockTreeView.spy.setValueCalls, [[null]]);
	},
});

Deno.test({
	name: "load material with a material map",
	async fn() {
		const {assetContent} = basicSetup();
		const materialMap = new MaterialMap();
		const material = new Material(materialMap);
		const mockMaterialAsset = createMockProjectAsset({
			liveAsset: material,
		});

		await assetContent.selectionUpdated([mockMaterialAsset]);

		const mockTreeView = castTreeView(assetContent.mapTreeView);
		assertEquals(mockTreeView.spy.setValueCalls.length, 1);
		assertEquals(mockTreeView.spy.setValueCalls[0].length, 1);
		assertStrictEquals(mockTreeView.spy.setValueCalls[0][0], materialMap);
	},
});
