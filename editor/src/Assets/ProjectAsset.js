import editor from "../editorInstance.js";

export default class ProjectAsset{
	constructor({
		uuid = null,
		path = [],
		assetType = null,
		forceAssetType = false,
	} = {}){
		this.uuid = uuid;
		this.path = path;
		this.assetType = assetType;
		this.forceAssetType = forceAssetType;
	}

	static async fromJsonData(uuid, assetData){
		if(!assetData.assetType){
			assetData.assetType = await this.guessAssetType(assetData.path);
			assetData.forceAssetType = false;
		};
		const projectAsset = new ProjectAsset({uuid,...assetData});
		return projectAsset;
	}

	static async guessAssetType(path = []){
		if(!path || path.length <= 0) return null;
		const fileName = path[path.length - 1];
		if(fileName.endsWith(".jjmesh")) return "mesh";
		const json = await editor.projectManager.currentProjectFileSystem.readJson(path);
		return json?.assetType ?? "unknown";
	}

	toJson(){
		const assetData = {
			path: this.path,
		}
		if(this.forceAssetType){
			assetData.assetType = this.assetType;
		}
		return assetData;
	}

	async getLiveAsset(){} //todo

	saveLiveAsset(){} //todo
}
