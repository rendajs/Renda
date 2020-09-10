import ProjectAssetType from "./ProjectAssetType.js";
import PropertiesAssetContentAssetBundle from "../../PropertiesAssetContent/PropertiesAssetContentAssetBundle.js";

export default class ProjectAssetTypeAssetBundle extends ProjectAssetType{

	static type = "assetBundle";
	static newFileName = "New AssetBundle";
	static propertiesAssetContentConstructor = PropertiesAssetContentAssetBundle;

	constructor(){
		super();
	}

	static createNewFile(){
		return {};
	}
}
