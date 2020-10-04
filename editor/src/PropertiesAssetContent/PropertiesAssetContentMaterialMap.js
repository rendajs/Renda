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

		const mapStructure = {
			maps: {
				type: Array,
				arrayOpts: {
					type: mapStruct,
				},
			},
		};

		this.mapSettingsTree = this.treeView.addCollapsable("map settings");
		this.mapSettingsTree.generateFromSerializableStructure(mapStructure);
	}
}
