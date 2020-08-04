import PropertiesAssetContent from "./PropertiesAssetContent.js";

export default class PropertiesAssetContentJavascript extends PropertiesAssetContent{
	constructor(){
		super();
		const scriptTree = this.treeView.addCollapsable("script settings");
		scriptTree.addItem({
			label: "build output location",
			type: "string",
		});
	}
}
