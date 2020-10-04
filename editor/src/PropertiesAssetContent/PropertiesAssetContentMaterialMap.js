import PropertiesAssetContent from "./PropertiesAssetContent.js";
import {Material} from "../../../src/index.js";

export default class PropertiesAssetContentMaterialMap extends PropertiesAssetContent{
	constructor(){
		super();

		const mappedNameStruct = {
			from: {
				type: String,
			},
			to: {
				type: String,
			},
		};

		const mapStruct = {
			mapTypeId: {
				type: String,
			},
			mappedNames: {
				type: Array,
				arrayOpts: {
					type: mappedNameStruct,
				}
			},
		};

		this.mapStructure = {
			maps: {
				type: Array,
				arrayOpts: {
					type: mapStruct,
				},
			},
		};

		this.mapSettingsTree = this.treeView.addCollapsable("map settings");
		this.mapSettingsTree.generateFromSerializableStructure(this.mapStructure);
		this.isUpdatingBundleSettingsTree = false;
		this.mapSettingsTree.onChildValueChange(_ => {
			if(this.isUpdatingBundleSettingsTree) return;
			const guiValues = this.getGuiValues();
			//todo: handle multiple selected items or no selection
			this.currentSelection[0].writeAssetData(guiValues);
		});
	}

	async selectionUpdated(selectedMaps){
		super.selectionUpdated(selectedMaps);
		//todo: handle multiple selected items or no selection
		const map = selectedMaps[0];
		const mapData = await map.readAssetData();
		this.isUpdatingBundleSettingsTree = true;
		this.mapSettingsTree.fillSerializableStructureValues(mapData);
		this.isUpdatingBundleSettingsTree = false;
	}

	getGuiValues(){
		return this.mapSettingsTree.getSerializableStructureValues(this.mapStructure);
	}
}
