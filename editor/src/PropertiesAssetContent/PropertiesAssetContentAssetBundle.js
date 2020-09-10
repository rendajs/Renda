import PropertiesAssetContent from "./PropertiesAssetContent.js";

export default class PropertiesAssetContentAssetBundle extends PropertiesAssetContent{
	constructor(){
		super();
		const materialSettingsTree = this.treeView.addCollapsable("asset bundle settings");
	}
}
