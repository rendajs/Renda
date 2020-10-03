import PropertiesAssetContent from "./PropertiesAssetContent.js";
import {Material} from "../../../src/index.js";

export default class PropertiesAssetContentMaterialMap extends PropertiesAssetContent{
	constructor(){
		super();
		const materialSettingsTree = this.treeView.addCollapsable("material settings");
	}
}
