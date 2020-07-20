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

		const AssetTypeConstructor = editor.projectAssetTypeManager.getAssetType(assetType);
		this.projectAssetType = new AssetTypeConstructor(this);

		this.liveAsset = null;
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

	get name(){
		return this.path[this.path.length - 1];
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

	async open(){
		await this.projectAssetType.open();
	}

	//todo: make sure this promise has only one instance running at a time
	async getLiveAsset(){
		if(this.liveAsset) return this.liveAsset;

		let fileData = null;
		if(this.projectAssetType.constructor.storeInProjectAsJson){
			const json = await editor.projectManager.currentProjectFileSystem.readJson(this.path);
			fileData = json.asset;
		}else{
			fileData = await editor.projectManager.currentProjectFileSystem.readFile(this.path);
		}

		this.liveAsset = await this.projectAssetType.getLiveAsset(fileData);
		return this.liveAsset;
	}

	saveLiveAsset(){} //todo
}
