import PropertiesAssetContent from "./PropertiesAssetContent.js";
import {Mesh} from "../../../src/index.js";
import ProjectAsset from "../Assets/ProjectAsset.js";

export default class PropertiesAssetContentAssetBundle extends PropertiesAssetContent{
	constructor(){
		super();
		const bundleSettingsTree = this.treeView.addCollapsable("asset bundle settings");
		this.assetsArrayGui = bundleSettingsTree.addItem({
			type: Array,
			guiItemOpts:{
				arrayTypeOpts:{
					type: ProjectAsset,
				}
			}
		});
	}

	updateAll(selectedBundles){
		console.log(selectedBundles);
	}
}
