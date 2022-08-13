import {PropertiesTreeView} from "../../ui/propertiesTreeView/PropertiesTreeView.js";
import {MaterialMapListUi} from "./MaterialMapListUi.js";
import {PropertiesMaterialMapContentGenericStructure} from "../../propertiesMaterialMapContent/PropertiesMaterialMapContentGenericStructure.js";

/**
 * This class is instantiated for every added MaterialMapType in a PropertiesAssetContentMaterialMap.
 * This class is essentially a container for a MaterialMapListUi and an extended PropertiesMaterialMapContent.
 */
export class MaterialMapTypeEntry {
	/**
	 * @param {import("../../Editor.js").Editor} editorInstance
	 * @param {typeof import("../../assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapTypeSerializer} typeConstructor
	 */
	constructor(editorInstance, typeConstructor) {
		this.editorInstance = editorInstance;
		this.typeConstructor = typeConstructor;

		const PropertiesContentConstructor = typeConstructor.propertiesMaterialMapContentConstructor;
		if (PropertiesContentConstructor) {
			this.propertiesContentInstance = new PropertiesContentConstructor(this);
		} else {
			if (!typeConstructor.settingsStructure) {
				throw new Error("typeConstructor.settingsStructure is not set");
			}
			this.propertiesContentInstance = new PropertiesMaterialMapContentGenericStructure(this, typeConstructor.settingsStructure);
		}

		this.treeView = new PropertiesTreeView();
		this.settingsTreeView = this.treeView.addCollapsable("Map Settings");
		this.settingsTreeView.addChild(this.propertiesContentInstance.treeView);
		/** @type {Set<() => void>} */
		this.onValueChangeCbs = new Set();
		this.mapListTreeView = this.treeView.addCollapsable("Map List");
		this.mapListUi = null;
		this.lastSavedCustomData = null;
		this.lastSavedCustomDataDirty = true;
		this.lastSelectedMaps = null;
	}

	/**
	 * Notifies the `PropertiesMaterialMapContent` instance that the selected map assets have been changed.
	 * This notification shouldn't be used for updating asset data, as {@linkcode customAssetDataFromLoad} and
	 * {@linkcode fillMapListValues} are already used for that.
	 * This is mostly useful for assigning the current parent asset to ui in order to make embedded assets work.
	 * @param {import("../../assets/ProjectAsset.js").ProjectAsset<import("../../assets/projectAssetType/ProjectAssetTypeMaterialMap.js").ProjectAssetTypeMaterialMap>[]} selectedMaps
	 */
	selectedAssetsUpdated(selectedMaps) {
		this.propertiesContentInstance.selectedAssetsUpdated(selectedMaps);
		this.lastSelectedMaps = selectedMaps;
	}

	/**
	 * Notifies the `PropertiesMaterialMapContent` instance that current data has changed and ui needs to be updated.
	 * @param {any} customData
	 */
	async customAssetDataFromLoad(customData) {
		this.propertiesContentInstance.customAssetDataFromLoad(customData);
	}

	async getCustomAssetDataForSave() {
		if (this.lastSavedCustomDataDirty) {
			const customData = await this.propertiesContentInstance.getCustomAssetDataForSave();
			this.lastSavedCustomData = customData;
			this.lastSavedCustomDataDirty = false;
		}
		return this.lastSavedCustomData;
	}

	async updateMapListUi() {
		if (this.mapListUi) {
			this.mapListUi.destructor();
			this.mapListUi = null;
		}

		const assetManager = await this.editorInstance.projectManager.getAssetManager();

		if (!this.lastSelectedMaps || this.lastSelectedMaps.length != 1) {
			throw new Error("Assertion failed: lastSelected maps is not set or has multiple entries");
		}

		/** @type {import("../../assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapLiveAssetDataContext} */
		const context = {
			editor: this.editorInstance,
			assetManager,
			materialMapAsset: this.lastSelectedMaps[0],
		};
		const mappableValues = await this.typeConstructor.getMappableValues(context, await this.getCustomAssetDataForSave());
		this.mapListUi = new MaterialMapListUi({
			items: mappableValues,
		});
		this.mapListTreeView.addChild(this.mapListUi.treeView);
		this.mapListUi.onValueChange(() => {
			this.valueChanged();
		});
	}

	/**
	 * Updates the list of mappable values with the specified values.
	 * @param {import("../../assets/MaterialMapTypeSerializerManager.js").MaterialMapMappedValuesAssetData} values
	 */
	fillMapListValues(values) {
		if (!this.mapListUi) return;
		this.mapListUi.setValues(values);
	}

	/**
	 * @param {() => void} cb
	 */
	onValueChange(cb) {
		this.onValueChangeCbs.add(cb);
	}

	valueChanged() {
		this.lastSavedCustomDataDirty = true;
		for (const cb of this.onValueChangeCbs) {
			cb();
		}
	}

	async getMappedValuesForSave() {
		return this.mapListUi?.getModifiedValuesForSave();
	}
}
