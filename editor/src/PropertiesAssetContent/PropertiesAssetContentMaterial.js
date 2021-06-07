import PropertiesAssetContent from "./PropertiesAssetContent.js";
import ProjectAsset from "../Assets/ProjectAsset.js";
import editor from "../editorInstance.js";

export default class PropertiesAssetContentMaterial extends PropertiesAssetContent{
	constructor(){
		super();
		const materialSettingsTree = this.treeView.addCollapsable("material settings");
		this.mapTreeView = materialSettingsTree.addItem({
			type: ProjectAsset,
			guiOpts: {
				label: "Map",
			},
		});
		this.mapValuesTreeView = materialSettingsTree.addCollapsable("map values");
		materialSettingsTree.onChildValueChange(() => {
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

		await this.mapTreeView.gui.setValueFromAssetUuid(mapData?.map);
		this.updateMapValues();

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

	async updateMapValues(){
		this.mapValuesTreeView.clearChildren();
		const mapValues = await editor.materialMapTypeManager.getMapValuesForMapAssetUuid(this.mapTreeView.value);
		for(const [name, valueData] of mapValues){
			this.mapValuesTreeView.addItem({
				type: valueData.type,
				guiOpts:{
					label: name,
				},
			});
		}
	}
}
