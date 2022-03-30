import "../../../shared/initializeEditor.js";
import {assertEquals, assertStrictEquals} from "asserts";
import {createMockProjectAsset} from "./shared.js";
import {Material} from "../../../../../../src/mod.js";
import {createMockKeyboardShortcutManager} from "../../../shared/mockKeyboardShortcutManager.js";
import {MaterialMap} from "../../../../../../src/rendering/MaterialMap.js";
import {Importer} from "fake-imports";
import {castTreeView} from "../../../shared/mockTreeView/castTreeView.js";
import {waitForMicrotasks} from "../../../../shared/waitForMicroTasks.js";

const DEFAULT_ASSET_MAP_UUID = "default-asset-map-uuid";

const importer = new Importer(import.meta.url);
importer.fakeModule("../../../../../../editor/src/windowManagement/contentWindows/ContentWindowEntityEditor.js", `
	export class ContentWindowEntityEditor {}
`);
importer.redirectModule("../../../../../../editor/src/ui/propertiesTreeView/PropertiesTreeView.js", "../../../shared/mockTreeView/PropertiesTreeView.js");
importer.fakeModule("../../../../../../src/rendering/MaterialMap.js", `
	export class MaterialMap {}
`);
const {PropertiesAssetContentMaterial} = await importer.import("../../../../../../editor/src/propertiesWindowContent/propertiesAssetContent/PropertiesAssetContentMaterial.js");

function basicSetup() {
	const {keyboardShortcutManager} = createMockKeyboardShortcutManager();

	let didCallNotifyMaterialChanged = false;

	const mockEditorInstance = /** @type {import("../../../../../../editor/src/Editor.js").Editor} */ ({
		keyboardShortcutManager,
		projectManager: {
			assertAssetManagerExists() {
				return {};
			},
		},
		windowManager: {
			*getContentWindowsByConstructor(ctor) {
				const mockEntityEditor = /** @type {any} */ ({
					notifyMaterialChanged() {
						didCallNotifyMaterialChanged = true;
					},
				});
				yield mockEntityEditor;
			},
		},
	});

	const assetContent = new PropertiesAssetContentMaterial(mockEditorInstance);
	const castAssetContent = /** @type {import("../../../../../../editor/src/propertiesWindowContent/propertiesAssetContent/PropertiesAssetContentMaterial.js").PropertiesAssetContentMaterial} */ (assetContent);
	return {
		assetContent: castAssetContent,
		getDidCallNotifyMaterialChanged() {
			return didCallNotifyMaterialChanged;
		},
	};
}

Deno.test({
	name: "load material without a material map",
	async fn() {
		const {assetContent} = basicSetup();
		const {projectAsset: mockMaterialAsset} = createMockProjectAsset({
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
		const {projectAsset: mockMaterialAsset} = createMockProjectAsset({
			liveAsset: material,
		});

		await assetContent.selectionUpdated([mockMaterialAsset]);

		const mockTreeView = castTreeView(assetContent.mapTreeView);
		assertEquals(mockTreeView.spy.setValueCalls.length, 1);
		assertEquals(mockTreeView.spy.setValueCalls[0].length, 1);
		assertStrictEquals(mockTreeView.spy.setValueCalls[0][0], materialMap);
	},
});

Deno.test({
	name: "save data when maptreeview value changes",
	async fn() {
		const {assetContent, getDidCallNotifyMaterialChanged} = basicSetup();
		const material = new Material();
		const {projectAsset: mockMaterialAsset, getSaveLiveAssetDataCallCount} = createMockProjectAsset({
			liveAsset: material,
		});

		await assetContent.selectionUpdated([mockMaterialAsset]);

		const mockTreeView = castTreeView(assetContent.mapTreeView);
		const materialMap = new MaterialMap();
		mockTreeView.mock.setGetValueReturn(materialMap);
		mockTreeView.mock.fireOnValueChangeCbs(DEFAULT_ASSET_MAP_UUID);

		await waitForMicrotasks();

		assertStrictEquals(material.materialMap, materialMap);
		assertEquals(getDidCallNotifyMaterialChanged(), true);
		assertEquals(getSaveLiveAssetDataCallCount(), 1);
	},
});

Deno.test({
	name: "maptreeview value change does not save data when the ui values are still loading",
	async fn() {
		const {assetContent, getDidCallNotifyMaterialChanged} = basicSetup();
		const material = new Material();
		const {
			projectAsset: mockMaterialAsset,
			getSaveLiveAssetDataCallCount,
			triggerLiveAssetReturns,
		} = createMockProjectAsset({
			liveAsset: material,
			allowImmediateLiveAssetReturn: false,
		});

		const selectionUpdatedPromise = assetContent.selectionUpdated([mockMaterialAsset]);

		const mockTreeView = castTreeView(assetContent.mapTreeView);
		const materialMap = new MaterialMap();
		mockTreeView.mock.setGetValueReturn(materialMap);
		mockTreeView.mock.fireOnValueChangeCbs(DEFAULT_ASSET_MAP_UUID);

		triggerLiveAssetReturns();
		await waitForMicrotasks();

		triggerLiveAssetReturns();
		await waitForMicrotasks();

		await selectionUpdatedPromise;
		await waitForMicrotasks();

		assertEquals(material.materialMap, null);
		assertEquals(getDidCallNotifyMaterialChanged(), false);
		assertEquals(getSaveLiveAssetDataCallCount(), 0);
	},
});
