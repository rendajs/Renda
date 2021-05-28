import ProjectAsset from "./ProjectAsset.js";
import {SingleInstancePromise} from "../../../src/index.js";
import editor from "../editorInstance.js";
import {IS_DEV_BUILD} from "../editorDefines.js";

export default class BuiltInAssetManager{
	constructor(){
		this.assets = new Map();
		this.basePath = "../builtInAssets/";

		if(IS_DEV_BUILD){
			this.onAssetChangeCbs = new Set();
		}

		this.loadAssetsInstance = new SingleInstancePromise(async () => {
			const response = await fetch(this.basePath + "assetSettings.json");
			const json = await response.json();
			const existingUuids = new Set(this.assets.keys());
			for(const [uuid, assetData] of Object.entries(json.assets)){
				if(existingUuids.has(uuid)){
					existingUuids.delete(uuid);
					continue;
				}
				assetData.isBuiltIn = true;
				const projectAsset = await ProjectAsset.fromJsonData(uuid, assetData);
				if(projectAsset){
					projectAsset.onNewLiveAssetInstance(() => {
						for(const cb of this.onAssetChangeCbs){
							cb(uuid);
						}
					});
					this.assets.set(uuid, projectAsset);
				}
			}
			for(const uuid of existingUuids){
				const asset = this.assets.get(uuid);
				asset.destructor();
				this.assets.delete(uuid);
			}
		}, {run: true, once: false});
	}

	init(){
		if(IS_DEV_BUILD){
			editor.devSocket.addListener("builtInAssetChange", data => {
				const asset = this.assets.get(data.uuid);
				if(asset){
					asset.fileChangedExternally();
				}
			});
			editor.devSocket.addListener("builtInAssetListUpdate", () => {
				this.loadAssetsInstance.run(true);
			});
		}
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
		}else if(format == "binary"){
			return await response.arrayBuffer();
		}
	}

	onAssetChange(cb){
		if(!IS_DEV_BUILD) return;
		this.onAssetChangeCbs.add(cb);
	}
}
