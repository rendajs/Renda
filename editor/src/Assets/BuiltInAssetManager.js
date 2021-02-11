import ProjectAsset from "./ProjectAsset.js";

export default class BuiltInAssetManager{
	constructor(){
		this.builtInAssets = new Map();
		this.basePath = "../builtInAssets/";

		this.loadBuiltInAssets();
	}

	async loadBuiltInAssets(){
		const response = await fetch(this.basePath + "assetSettings.json");
		const json = await response.json();
		for(const [uuid, assetData] of Object.entries(json.assets)){
			const projectAsset = await ProjectAsset.fromJsonData(uuid, assetData);
			if(projectAsset){
				projectAsset.makeBuiltIn();
				this.builtInAssets.set(uuid, projectAsset);
			}
		}
	}

	async fetchAsset(path, format="json"){
		const response = await fetch(this.basePath + path.join("/"));
		if(format == "json"){
			return await response.json();
		}else if(format == "text"){
			return await response.text();
		}
	}
}
