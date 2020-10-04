import PropertiesAssetContent from "./PropertiesAssetContent.js";
import {MaterialMap} from "../../../src/index.js";

export default class PropertiesAssetContentMaterial extends PropertiesAssetContent{
	constructor(){
		super();
		const materialSettingsTree = this.treeView.addCollapsable("material settings");
		this.mapTreeView = materialSettingsTree.addItem({
			type: MaterialMap,
			guiOpts: {
				label: "Map",
			},
		});
		this.mapTreeView.onValueChange(_ => {
			if(this.isUpdatingUi) return;
			this.saveAsset();
		});

		this.isUpdatingUi = false;
	}

	async loadAsset(){
		//todo: handle multiple selected items or no selection

		const map = this.currentSelection[0];
		const mapData = await map.readAssetData();
		this.isUpdatingUi = true;

		this.mapTreeView.gui.setFromAssetUuid(mapData.map);

		this.isUpdatingUi = false;
	}

	saveAsset(){
		//todo: handle multiple selected items or no selection
		const assetData = {};
		assetData.map = this.mapTreeView.value.uuid;
		this.currentSelection[0].writeAssetData(assetData);
	}

	async selectionUpdated(selectedMaterials){
		super.selectionUpdated(selectedMaterials);
		this.loadAsset();
	}
}
