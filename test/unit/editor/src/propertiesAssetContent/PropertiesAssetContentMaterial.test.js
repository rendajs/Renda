import {assertEquals, assertStrictEquals} from "std/testing/asserts";
import "../../shared/initializeEditor.js";
import {createMockProjectAsset} from "../assets/shared/createMockProjectAsset.js";
import {Material} from "../../../../../src/mod.js";
import {createMockKeyboardShortcutManager} from "../../shared/mockKeyboardShortcutManager.js";
import {MaterialMap} from "../../../../../src/rendering/MaterialMap.js";
import {Importer} from "fake-imports";
import {castTreeView} from "../../shared/mockTreeView/castTreeView.js";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";
import {MATERIAL_MAP_PERSISTENCE_KEY} from "../../../../../editor/src/assets/projectAssetType/MaterialProjectAssetType.js";

const DEFAULT_ASSET_MAP_UUID = "default-asset-map-uuid";

const importer = new Importer(import.meta.url);
importer.fakeModule("../../../../../editor/src/windowManagement/contentWindows/ContentWindowEntityEditor.js", `
	export class ContentWindowEntityEditor {}
`);
importer.redirectModule("../../../../../editor/src/ui/propertiesTreeView/PropertiesTreeView.js", "../../shared/mockTreeView/PropertiesTreeView.js");
importer.fakeModule("../../../../../src/rendering/MaterialMap.js", `
	export class MaterialMap {}
`);
importer.fakeModule("../../../../../editor/src/assets/projectAssetType/MaterialProjectAssetType.js", `
	export const MATERIAL_MAP_PERSISTENCE_KEY = "${MATERIAL_MAP_PERSISTENCE_KEY}";
`);
/** @type {import("../../../../../editor/src/propertiesAssetContent/PropertiesAssetContentMaterial.js")} */
const PropertiesAssetContentMaterialImport = await importer.import("../../../../../editor/src/propertiesAssetContent/PropertiesAssetContentMaterial.js");
const {PropertiesAssetContentMaterial} = PropertiesAssetContentMaterialImport;

function basicSetup() {
	const {keyboardShortcutManager} = createMockKeyboardShortcutManager();

	let didCallNotifyMaterialChanged = false;

	const mockEditorInstance = /** @type {import("../../../../../editor/src/Editor.js").Editor} */ ({
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

	/**
	 * @typedef EmbeddedParentAssetCall
	 * @property {import("../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetAny} parentAsset
	 * @property {unknown} persistenceKey
	 */

	/** @type {(EmbeddedParentAssetCall | null)[]} */
	const setEmbeddedParentAssetCalls = [];
	assetContent.mapTreeView.gui.setEmbeddedParentAsset = (parentAsset, persistenceKey) => {
		setEmbeddedParentAssetCalls.push({parentAsset, persistenceKey});
	};
	assetContent.mapTreeView.gui.removeEmbeddedAssetSupport = () => {
		setEmbeddedParentAssetCalls.push(null);
	};

	return {
		assetContent,
		setEmbeddedParentAssetCalls,
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

Deno.test({
	name: "selecting multiple items resets materialmap droppable embedded asset parent",
	async fn() {
		const {assetContent, setEmbeddedParentAssetCalls} = basicSetup();
		const {projectAsset: mockMaterialAsset1} = createMockProjectAsset({
			liveAsset: new Material(),
		});
		const {projectAsset: mockMaterialAsset2} = createMockProjectAsset({
			liveAsset: new Material(),
		});

		await assetContent.selectionUpdated([mockMaterialAsset1]);
		await assetContent.selectionUpdated([mockMaterialAsset1, mockMaterialAsset2]);
		await assetContent.selectionUpdated([mockMaterialAsset2]);

		assertEquals(setEmbeddedParentAssetCalls, [
			{parentAsset: mockMaterialAsset1, persistenceKey: "materialMap"},
			null,
			{parentAsset: mockMaterialAsset2, persistenceKey: "materialMap"},
		]);
		assertStrictEquals(setEmbeddedParentAssetCalls[0]?.parentAsset, mockMaterialAsset1);
		assertStrictEquals(setEmbeddedParentAssetCalls[2]?.parentAsset, mockMaterialAsset2);
	},
});
