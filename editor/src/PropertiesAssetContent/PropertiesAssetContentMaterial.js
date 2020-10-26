import PropertiesAssetContent from "./PropertiesAssetContent.js";
import ProjectAsset from "../Assets/ProjectAsset.js";

export default class PropertiesAssetContentMaterial extends PropertiesAssetContent{
	constructor(){
		super();
		const materialSettingsTree = this.treeView.addCollapsable("material settings");
		this.mapTreeView = materialSettingsTree.addItem({
			type: ProjectAsset,
			guiOpts: {
				label: "Map",
				storageType: "uuid",
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

		this.mapTreeView.gui.setValue(mapData.map);

		this.isUpdatingUi = false;
	}

	saveAsset(){
		//todo: handle multiple selected items or no selection
		const assetData = {};
		assetData.map = this.mapTreeView.value;
		this.currentSelection[0].writeAssetData(assetData);
	}

	async selectionUpdated(selectedMaterials){
		super.selectionUpdated(selectedMaterials);
		this.loadAsset();
	}
}
