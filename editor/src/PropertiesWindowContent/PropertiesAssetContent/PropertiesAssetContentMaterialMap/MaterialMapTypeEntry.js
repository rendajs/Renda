import {PropertiesTreeView} from "../../../UI/PropertiesTreeView/PropertiesTreeView.js";
import {MaterialMapListUi} from "./MaterialMapListUi.js";
import {PropertiesMaterialMapContentGenericStructure} from "./PropertiesMaterialMapContent/PropertiesMaterialMapContentGenericStructure.js";

/**
 * This class is instantiated for every added MaterialMapType in a PropertiesAssetContentMaterialMap.
 * This class is essentially a container for a MaterialMapListUi and an extended PropertiesMaterialMapContent.
 */
export class MaterialMapTypeEntry {
	/**
	 * @param {typeof import("../../../assets/projectAssetType/projectAssetTypeMaterialMap/materialMapTypes/MaterialMapTypeSerializer.js").MaterialMapTypeSerializer} typeConstructor
	 */
	constructor(typeConstructor) {
		this.typeConstructor = typeConstructor;

		const PropertiesContentConstructor = typeConstructor.propertiesMaterialMapContentConstructor;
		if (PropertiesContentConstructor) {
			this.propertiesContentInstance = new PropertiesContentConstructor();
		} else {
			this.propertiesContentInstance = new PropertiesMaterialMapContentGenericStructure(typeConstructor.settingsStructure);
		}
		this.propertiesContentInstance.mapTypeEntry = this;

		this.treeView = new PropertiesTreeView();
		this.settingsTreeView = this.treeView.addCollapsable("Map Settings");
		this.settingsTreeView.addChild(this.propertiesContentInstance.treeView);
		this.onValueChangeCbs = new Set();
		this.mapListTreeView = this.treeView.addCollapsable("Map List");
		this.mapListUi = null;
		this.lastSavedCustomData = null;
		this.lastSavedCustomDataDirty = true;
	}

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

		const mappableValues = await this.typeConstructor.getMappableValues(await this.getCustomAssetDataForSave());
		this.mapListUi = new MaterialMapListUi({
			items: mappableValues,
		});
		this.mapListTreeView.addChild(this.mapListUi.treeView);
		this.mapListUi.onValueChange(() => {
			this.valueChanged();
		});
	}

	fillMapListValues(values) {
		if (!this.mapListUi) return;
		this.mapListUi.setValues(values);
	}

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
