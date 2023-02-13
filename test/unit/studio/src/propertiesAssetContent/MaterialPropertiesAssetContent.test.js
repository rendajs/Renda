import {assertEquals, assertStrictEquals} from "std/testing/asserts.ts";
import {stub} from "std/testing/mock.ts";
import "../../shared/initializeStudio.js";
import {createMockProjectAsset} from "../../shared/createMockProjectAsset.js";
import {Material, Vec2, Vec3, Vec4} from "../../../../../src/mod.js";
import {createMockKeyboardShortcutManager} from "../../shared/mockKeyboardShortcutManager.js";
import {MaterialMap} from "../../../../../src/rendering/MaterialMap.js";
import {Importer} from "fake-imports";
import {castTreeView} from "../../shared/mockTreeView/castTreeView.js";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";
import {MATERIAL_MAP_PERSISTENCE_KEY} from "../../../../../studio/src/assets/projectAssetType/ProjectAssetTypeMaterial.js";
import {Texture} from "../../../../../src/core/Texture.js";

const DEFAULT_ASSET_MAP_UUID = "default-asset-map-uuid";

const importer = new Importer(import.meta.url, {
	importMap: "../../../../../importmap.json",
});
importer.fakeModule("../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor.js", `
	export class ContentWindowEntityEditor {}
`);
importer.redirectModule("../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeView.js", "../../shared/mockTreeView/PropertiesTreeView.js");
importer.fakeModule("../../../../../src/rendering/MaterialMap.js", `
	export class MaterialMap {}
`);
importer.fakeModule("../../../../../studio/src/assets/projectAssetType/ProjectAssetTypeMaterial.js", `
	export const MATERIAL_MAP_PERSISTENCE_KEY = "${MATERIAL_MAP_PERSISTENCE_KEY}";
`);
importer.makeReal("../../../../../src/core/Texture.js");
/** @type {import("../../../../../studio/src/propertiesAssetContent/PropertiesAssetContentMaterial.js")} */
const PropertiesAssetContentMaterialImport = await importer.import("../../../../../studio/src/propertiesAssetContent/PropertiesAssetContentMaterial.js");
const {PropertiesAssetContentMaterial} = PropertiesAssetContentMaterialImport;

function basicSetup() {
	const {keyboardShortcutManager} = createMockKeyboardShortcutManager();

	let didCallNotifyMaterialChanged = false;

	const mockEditorInstance = /** @type {import("../../../../../studio/src/Studio.js").Studio} */ ({
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
		materialMapTypeSerializerManager: {
			getMapValuesForMapAssetUuid(mapAssetUuid) {
				/** @type {import("../../../../../studio/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue[]} */
				const arr = [];
				return Promise.resolve(arr);
			},
		},
	});

	const assetContent = new PropertiesAssetContentMaterial(mockEditorInstance);

	/**
	 * @typedef EmbeddedParentAssetCall
	 * @property {import("../../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny} parentAsset
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
		mockEditorInstance,
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
		const mockMapTreeView = castTreeView(assetContent.mapTreeView);
		mockMapTreeView.mock.setGetValueReturn(DEFAULT_ASSET_MAP_UUID);

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
		const mockMapTreeView = castTreeView(assetContent.mapTreeView);
		mockMapTreeView.mock.setGetValueReturn(DEFAULT_ASSET_MAP_UUID);

		await assetContent.selectionUpdated([mockMaterialAsset]);

		const mockTreeView = castTreeView(assetContent.mapTreeView);
		assertEquals(mockTreeView.spy.setValueCalls.length, 1);
		assertEquals(mockTreeView.spy.setValueCalls[0].length, 1);
		assertStrictEquals(mockTreeView.spy.setValueCalls[0][0], materialMap);
	},
});

Deno.test({
	name: "load material with a material map and properties",
	async fn() {
		const {assetContent, mockEditorInstance} = basicSetup();
		stub(mockEditorInstance.materialMapTypeSerializerManager, "getMapValuesForMapAssetUuid", async () => {
			/** @type {import("../../../../../studio/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeMappableValue[]} */
			const values = [
				{
					name: "num",
					type: "number",
				},
				{
					name: "vec2",
					type: "vec2",
				},
				{
					name: "vec3",
					type: "vec3",
				},
				{
					name: "vec4",
					type: "vec4",
				},
				{
					name: "numWithDefault",
					type: "number",
					defaultValue: 1,
				},
				{
					name: "vec2WithDefault",
					type: "vec2",
					defaultValue: new Vec2(1, 2),
				},
				{
					name: "vec3WithDefault",
					type: "vec3",
					defaultValue: new Vec3(1, 2, 3),
				},
				{
					name: "vec4WithDefault",
					type: "vec4",
					defaultValue: new Vec4(1, 2, 3, 4),
				},
				{
					name: "texture2d",
					type: "texture2d",
				},
			];
			return values;
		});
		const mockMapTreeView = castTreeView(assetContent.mapTreeView);
		mockMapTreeView.mock.setGetValueReturn(DEFAULT_ASSET_MAP_UUID);
		const materialMap = new MaterialMap();
		const material = new Material(materialMap);
		const {projectAsset: mockMaterialAsset} = createMockProjectAsset({
			liveAsset: material,
		});

		await assetContent.selectionUpdated([mockMaterialAsset]);

		/** @type {import("../../../../../studio/src/ui/propertiesTreeView/types.js").PropertiesTreeViewEntryOptions[]} */
		const createdValueOptions = [];
		for (const child of assetContent.mapValuesTreeView.children) {
			const castChildEntry = /** @type {import("../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntry<any>} */ (child);
			const castMockChild = castTreeView(castChildEntry);
			createdValueOptions.push(castMockChild.spy.constructorOptions);
		}
		assertEquals(createdValueOptions, [
			{
				type: "number",
				guiOpts: {
					label: "num",
					defaultValue: undefined,
				},
			},
			{
				type: "vec2",
				guiOpts: {
					label: "vec2",
					defaultValue: undefined,
				},
			},
			{
				type: "vec3",
				guiOpts: {
					label: "vec3",
					defaultValue: undefined,
				},
			},
			{
				type: "vec4",
				guiOpts: {
					label: "vec4",
					defaultValue: undefined,
				},
			},
			{
				type: "number",
				guiOpts: {
					label: "numWithDefault",
					defaultValue: 1,
				},
			},
			{
				type: "vec2",
				guiOpts: {
					label: "vec2WithDefault",
					defaultValue: new Vec2(1, 2),
				},
			},
			{
				type: "vec3",
				guiOpts: {
					label: "vec3WithDefault",
					defaultValue: new Vec3(1, 2, 3),
				},
			},
			{
				type: "vec4",
				guiOpts: {
					label: "vec4WithDefault",
					defaultValue: new Vec4(1, 2, 3, 4),
				},
			},
			{
				type: "droppable",
				guiOpts: {
					label: "texture2d",
					defaultValue: undefined,
					supportedAssetTypes: [Texture],
				},
			},
		]);
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
		const mockMapTreeView = castTreeView(assetContent.mapTreeView);
		mockMapTreeView.mock.setGetValueReturn(DEFAULT_ASSET_MAP_UUID);

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
		const mockMapTreeView = castTreeView(assetContent.mapTreeView);
		mockMapTreeView.mock.setGetValueReturn(DEFAULT_ASSET_MAP_UUID);

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
