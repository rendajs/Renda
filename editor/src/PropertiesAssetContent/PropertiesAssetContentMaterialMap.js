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

		this.addedMapTypes = new Map();
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

		this.ignoreValueChange = false;
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
		const map = selectedMaps[0];
		const mapData = await map.readAssetData();
		this.ignoreValueChange = true;
		await this.updateMaps(mapData);
		this.ignoreValueChange = false;
		// this.isUpdatingMapSettingsTree = true;
		// this.mapSettingsTree.fillSerializableStructureValues(mapData);
		// this.isUpdatingMapSettingsTree = false;
	}

	// getGuiValues(){
	// 	return this.mapSettingsTree.getSerializableStructureValues(this.mapStructure);
	// }

	hasTypeConstructor(typeConstructor){
		return this.addedMapTypes.has(typeConstructor.typeUuid);
	}

	addMapTypeUuid(uuid){
		const constructor = editor.materialMapTypeManager.getTypeByUuid(uuid);
		return this.addMapType(constructor);
	}

	addMapType(typeConstructor){
		if(this.hasTypeConstructor(typeConstructor)){
			return this.addedMapTypes.get(typeConstructor.typeUuid);
		}
		const treeView = this.mapTypesTreeView.addCollapsable(typeConstructor.uiName);

		const typeInstance = new typeConstructor(treeView);
		this.addedMapTypes.set(typeConstructor.typeUuid, typeInstance);
		typeInstance.onValueChange(_ => {
			if(!this.ignoreValueChange){
				this.saveSelectedAssets();
			}
		});
		return typeInstance;
	}

	async updateMaps(mapData){
		for(const map of mapData.maps){
			const typeInstance = this.addMapTypeUuid(map.mapTypeId);
			await typeInstance.loadData(map.mapData);
		}
	}

	async getAssetData(){
		const data = {
			maps: [],
		};
		for(const [uuid, mapInstance] of this.addedMapTypes){
			const map = {
				mapTypeId: uuid,
			}
			const mapData = await mapInstance.getData();
			if(mapData){
				map.mapData = mapData;
			}
			data.maps.push(map);
		}
		return data;
	}

	async saveSelectedAssets(){
		const assetData = await this.getAssetData();
		for(const asset of this.currentSelection){
			asset.writeAssetData(assetData);
		}
	}
}
