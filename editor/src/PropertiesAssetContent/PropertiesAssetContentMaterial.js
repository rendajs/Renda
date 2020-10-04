import PropertiesAssetContent from "./PropertiesAssetContent.js";
import {MaterialMap} from "../../../src/index.js";

export default class PropertiesAssetContentMaterial extends PropertiesAssetContent{
	constructor(){
		super();
		const materialSettingsTree = this.treeView.addCollapsable("material settings");
		materialSettingsTree.addItem({
			type: MaterialMap,
			guiOpts: {
				label: "Map",
			},
		});
	}
}
