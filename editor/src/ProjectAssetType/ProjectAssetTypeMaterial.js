import ProjectAssetType from "./ProjectAssetType.js";

export default class ProjectAssetTypeMaterial extends ProjectAssetType{

	static type = "material";
	static newFileName = "New Material";

	constructor(){
		super();
	}

	static createNewFile(){
		return {assetType: "material"};
	}
}
