import {PropertiesTreeView} from "../../../UI/propertiesTreeView/PropertiesTreeView.js";
import {MaterialMapListUi} from "./MaterialMapListUi.js";
import {PropertiesMaterialMapContentGenericStructure} from "./PropertiesMaterialMapContent/PropertiesMaterialMapContentGenericStructure.js";

/**
 * This class is instantiated for every added MaterialMapType in a PropertiesAssetContentMaterialMap.
 * This class is essentially a container for a MaterialMapListUi and an extended PropertiesMaterialMapContent.
 */
export class MaterialMapTypeEntry {
	/**
	 * @param {import("../../../Editor.js").Editor} editorInstance
	 * @param {typeof import("../../../assets/projectAssetType/projectAssetTypeMaterialMap/materialMapTypes/MaterialMapTypeSerializer.js").MaterialMapTypeSerializer} typeConstructor
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
	}

	/**
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
		const mappableValues = await this.typeConstructor.getMappableValues(this.editorInstance, assetManager, await this.getCustomAssetDataForSave());
		this.mapListUi = new MaterialMapListUi({
			items: mappableValues,
		});
		this.mapListTreeView.addChild(this.mapListUi.treeView);
		this.mapListUi.onValueChange(() => {
			this.valueChanged();
		});
	}

	/**
	 * @param {import("../../../assets/projectAssetType/projectAssetTypeMaterialMap/MaterialMapTypeSerializerManager.js").MaterialMapMappedValuesAssetData} values
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
