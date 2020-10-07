import PropertiesAssetContent from "./PropertiesAssetContent.js";
import {Material} from "../../../src/index.js";
import editor from "../editorInstance.js";

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

		this.addedMapTypes = new Set();
		this.mapTypesTreeView = this.treeView.addCollapsable("Map Types");

		this.addMapTypeButtonEntry = this.treeView.addItem({
			type: "button",
			guiOpts: {
				text: "Add Map Type",
				onClick: _ => {
					const menu = editor.contextMenuManager.createContextMenu();
					for(const typeConstructor of editor.materialMapTypeManager.getAllTypes()){
						const disabled = this.hasTypeConstructor(typeConstructor);
						menu.addItem(typeConstructor.uiName, _ => {
							this.addMapType(typeConstructor);
						}, {disabled});
					}

					menu.setPos(this.addMapTypeButtonEntry.gui, "top left");
				}
			},
		});
		// this.mapSettingsTree = this.treeView.addCollapsable("map settings");
		// this.mapSettingsTree.generateFromSerializableStructure(this.mapStructure);
		// this.isUpdatingMapSettingsTree = false;
		// this.mapSettingsTree.onChildValueChange(_ => {
		// 	if(this.isUpdatingMapSettingsTree) return;
		// 	const guiValues = this.getGuiValues();
		// 	//todo: handle multiple selected items or no selection
		// 	this.currentSelection[0].writeAssetData(guiValues);
		// });
	}

	async selectionUpdated(selectedMaps){
		super.selectionUpdated(selectedMaps);
		//todo: handle multiple selected items or no selection
		// const map = selectedMaps[0];
		// const mapData = await map.readAssetData();
		// this.isUpdatingMapSettingsTree = true;
		// this.mapSettingsTree.fillSerializableStructureValues(mapData);
		// this.isUpdatingMapSettingsTree = false;
	}

	// getGuiValues(){
	// 	return this.mapSettingsTree.getSerializableStructureValues(this.mapStructure);
	// }

	hasTypeConstructor(typeConstructor){
		for(const existingType of this.addedMapTypes){
			if(existingType.constructor.typeUuid == typeConstructor.typeUuid) return true;
		}
		return false;
	}

	addMapType(typeConstructor){
		if(this.hasTypeConstructor(typeConstructor)) return;
		const treeView = this.mapTypesTreeView.addCollapsable(typeConstructor.uiName);

		const typeInstance = new typeConstructor();
		this.addedMapTypes.add(typeInstance);
	}
}
