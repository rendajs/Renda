import ProjectAssetType from "./ProjectAssetType.js";
import PropertiesAssetContentAssetBundle from "../../PropertiesAssetContent/PropertiesAssetContentAssetBundle.js";

export default class ProjectAssetTypeAssetBundle extends ProjectAssetType{

	static type = "JJ:assetBundle";
	static typeUuid = "f5a6f81c-5404-4d0a-9c57-2a751699cc5c";
	static newFileName = "New AssetBundle";
	static propertiesAssetContentConstructor = PropertiesAssetContentAssetBundle;

	constructor(){
		super(...arguments);
	}
}
