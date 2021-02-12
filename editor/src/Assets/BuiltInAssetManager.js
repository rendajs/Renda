import ProjectAsset from "./ProjectAsset.js";
import {SingleInstancePromise} from "../../../src/index.js";

export default class BuiltInAssetManager{
	constructor(){
		this.builtInAssets = new Map();
		this.basePath = "../builtInAssets/";

		this.loadAssetsInstance = new SingleInstancePromise(async _ => {
			const response = await fetch(this.basePath + "assetSettings.json");
			const json = await response.json();
			for(const [uuid, assetData] of Object.entries(json.assets)){
				assetData.isBuiltIn = true;
				const projectAsset = await ProjectAsset.fromJsonData(uuid, assetData);
				if(projectAsset){
					projectAsset.makeBuiltIn();
					this.builtInAssets.set(uuid, projectAsset);
				}
			}
		}, {run: true});
	}

	async waitForLoad(){
		await this.loadAssetsInstance.waitForFinish();
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
