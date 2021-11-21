import {PropertiesTreeView} from "../UI/PropertiesTreeView/PropertiesTreeView.js";
import {MaterialMapListUi} from "./MaterialMapListUi.js";

export class PropertiesAssetContentMaterialMapTypeEntry {
	/**
	 * @param {typeof import("./MaterialMapType.js").MaterialMapType} typeConstructor
	 */
	constructor(typeConstructor) {
		this.typeConstructor = typeConstructor;

		const PropertiesContentConstructor = typeConstructor.propertiesMaterialMapContentConstructor;
		this.propertiesContentInstance = new PropertiesContentConstructor();
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

	async getCustomAssetDataForSaveInternal() {
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

		this.mapListUi = new MaterialMapListUi({
			items: await this.typeConstructor.getMappableValues(await this.getCustomAssetDataForSaveInternal()),
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

	async getMappableValuesForSave() {
		return this.mapListUi?.getValues();
	}
}
