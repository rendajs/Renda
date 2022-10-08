import {PropertiesAssetContent} from "./PropertiesAssetContent.js";
import {ContentWindowEntityEditor} from "../windowManagement/contentWindows/ContentWindowEntityEditor.js";
import {MaterialMap} from "../../../src/rendering/MaterialMap.js";
import {MATERIAL_MAP_PERSISTENCE_KEY} from "../assets/projectAssetType/ProjectAssetTypeMaterial.js";
import {DEFAULT_MATERIAL_MAP_UUID} from "../assets/builtinAssetUuids.js";
import {Texture} from "../../../src/core/Texture.js";
import {Sampler} from "../../../src/rendering/Sampler.js";
import {SingleInstancePromise} from "../../../src/util/SingleInstancePromise.js";

/**
 * @typedef {object} MaterialAssetData
 * @property {import("../../../src/util/mod.js").UuidString | object | null} [map]
 * @property {Object<string, *>} [properties]
 */

/**
 * @extends {PropertiesAssetContent<import("../assets/projectAssetType/ProjectAssetTypeMaterial.js").ProjectAssetTypeMaterial>}
 */
export class PropertiesAssetContentMaterial extends PropertiesAssetContent {
	/** @type {SingleInstancePromise<void>?} */
	#loadAssetInstance = null;
	/**
	 * @param {ConstructorParameters<typeof PropertiesAssetContent>} args
	 */
	constructor(...args) {
		super(...args);

		const materialTree = this.treeView.addCollapsable("material");
		this.mapTreeView = materialTree.addItem({
			type: "droppable",
			guiOpts: {
				supportedAssetTypes: [MaterialMap],
				label: "Map",
				defaultValue: DEFAULT_MATERIAL_MAP_UUID,
			},
		});
		this.mapTreeView.onValueChange(async () => {
			if (this.isUpdatingUi) return;

			// todo: support multiselect
			const asset = this.currentSelection[0];
			const {liveAsset: material} = await asset.getLiveAssetData();

			const mapAsset = this.mapTreeView.getValue({purpose: "script"});
			material.setMaterialMap(mapAsset);

			await this.loadMapValues();
			this.notifyEntityEditorsMaterialChanged();
			this.saveAsset();
		});

		this.#loadAssetInstance = new SingleInstancePromise(async () => {
			await this.loadAssetFn();
		});

		this.mapValuesTreeView = materialTree.addCollapsable("map values");

		this.isUpdatingUi = false;
	}

	/**
	 * @returns {Promise<import("../../../src/rendering/Material.js").Material>}
	 */
	async getFirstSelectedLiveAsset() {
		const asset = this.currentSelection[0];
		const liveAsset = await asset.getLiveAsset();
		const material = /** @type {import("../../../src/rendering/Material.js").Material} */ (liveAsset);
		return material;
	}

	async loadAssetFn() {
		// todo: handle multiple selected items or no selection

		this.isUpdatingUi = true;

		const material = await this.getFirstSelectedLiveAsset();
		if (this.currentSelection.length > 1) {
			this.mapTreeView.gui.removeEmbeddedAssetSupport();
		} else {
			this.mapTreeView.gui.setEmbeddedParentAsset(this.currentSelection[0], MATERIAL_MAP_PERSISTENCE_KEY);
		}
		this.mapTreeView.setValue(material.materialMap);
		await this.loadMapValues();

		this.isUpdatingUi = false;
	}

	async waitForAssetLoad() {
		if (!this.#loadAssetInstance) return;
		await this.#loadAssetInstance.waitForFinish();
	}

	async saveAsset() {
		// todo: handle multiple selected items or no selection
		const asset = this.currentSelection[0];
		const {liveAsset} = await asset.getLiveAssetData();
		if (liveAsset) {
			await asset.saveLiveAssetData();
		}
	}

	/**
	 * @override
	 * @param {import("../assets/ProjectAsset.js").ProjectAsset<any>[]} selectedMaterials
	 */
	async selectionUpdated(selectedMaterials) {
		super.selectionUpdated(selectedMaterials);
		if (this.#loadAssetInstance) {
			await this.#loadAssetInstance.run();
		}
	}

	async loadMapValues() {
		this.mapValuesTreeView.clearChildren();
		const material = await this.getFirstSelectedLiveAsset();
		/** @type {Object<string, unknown>} */
		const currentMaterialValues = {};
		for (const [key, value] of material.getAllProperties()) {
			currentMaterialValues[key] = value;
		}
		if (!this.mapTreeView.value) return;

		const mappableValues = await this.editorInstance.materialMapTypeSerializerManager.getMapValuesForMapAssetUuid(this.mapTreeView.value);
		/** @type {import("../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} */
		for (const valueData of mappableValues) {
			/** @type {import("../ui/propertiesTreeView/types.js").GuiTypes} */
			let guiType;
			/** @type {import("../ui/propertiesTreeView/types.js").GetGuiOptions<import("../ui/propertiesTreeView/types.js").GuiTypes>} */
			let extraGuiOpts = {};
			if (valueData.type == "sampler") {
				guiType = "droppable";
				extraGuiOpts = {
					supportedAssetTypes: [Sampler],
				};
			} else if (valueData.type == "texture2d") {
				guiType = "droppable";
				extraGuiOpts = {
					supportedAssetTypes: [Texture],
				};
			} else {
				guiType = valueData.type;
			}
			/** @type {import("../ui/propertiesTreeView/types.js").PropertiesTreeViewEntryOptions} */
			const addItemOpts = {
				type: guiType,
				guiOpts: {
					label: valueData.name,
					defaultValue: /** @type {any} */ (valueData.defaultValue),
					.../** @type {any} */(extraGuiOpts),
				},
			};
			const castAddItemOpts = /** @type {import("../ui/propertiesTreeView/types.js").PropertiesTreeViewEntryOptionsGeneric<any>} */ (addItemOpts);
			const entry = this.mapValuesTreeView.addItem(castAddItemOpts);
			const value = currentMaterialValues[valueData.name];
			if (value !== undefined) {
				entry.setValue(value);
			}
			entry.onValueChange(async () => {
				if (this.isUpdatingUi) return;

				const newValue = entry.getValue({
					purpose: "script",
				});

				MaterialMap.assertIsMappableType(newValue);

				// todo: support multiselect
				const asset = this.currentSelection[0];
				const {liveAsset: material} = await asset.getLiveAssetData();
				material.setProperty(valueData.name, newValue);

				this.notifyEntityEditorsMaterialChanged();
				this.saveAsset();
			});
		}
	}

	notifyEntityEditorsMaterialChanged() {
		for (const entityEditor of this.editorInstance.windowManager.getContentWindowsByConstructor(ContentWindowEntityEditor)) {
			entityEditor.notifyMaterialChanged();
		}
	}
}
