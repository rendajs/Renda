import PropertiesAssetContent from "./PropertiesAssetContent.js";
import {Material, Mesh} from "../../../src/index.js";

export default class PropertiesAssetContentMaterial extends PropertiesAssetContent{
	constructor(){
		super();
		const materialSettingsTree = this.treeView.addCollapsable("material settings");
		materialSettingsTree.addItem({
			label: "Vertex Shader",
			type: Mesh,
		});
		materialSettingsTree.addItem({
			label: "Fragment Shader",
			type: Mesh,
		});
	}

	static get useForType(){
		return Material;
	}
}
