import fsSync from "fs";
import {promises as fs} from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {sendAllConnections} from "./index.js";
import {generateUuid} from "./Util.js";
import {toFormattedJsonString} from "../src/Util/Util.js";
import md5 from "js-md5";

export default class BuiltInAssetManager{
	constructor(){
		const __dirname = path.dirname(fileURLToPath(import.meta.url));
		this.builtInAssetsPath = path.resolve(__dirname, "../builtInAssets/");
		this.assetSettingsPath = path.resolve(this.builtInAssetsPath, "assetSettings.json");

		this.assetSettingsLoaded = false;
		this.assetSettings = new Map();
		this.fileHashes = new Map(); //<md5, uuid>
		this.cachedUuidOrder = [];
		this.loadAssetSettings();
		this.watch();
	}

	async loadAssetSettings(){
		const str = await fs.readFile(this.assetSettingsPath, {encoding: "utf8"});
		const data = JSON.parse(str);
		this.assetSettings.clear();
		this.fileHashes.clear();
		this.cachedUuidOrder = [];
		for(const [uuid, assetData] of Object.entries(data.assets)){
			this.assetSettings.set(uuid, assetData);
			this.cachedUuidOrder.push(uuid);
			if(assetData.path){
				const fullPath = path.resolve(this.builtInAssetsPath, ...assetData.path);
				(async () => {
					const fileBuffer = await fs.readFile(fullPath);
					const hash = md5(fileBuffer);
					this.fileHashes.set(hash, uuid);
				})();
			}
		}
		this.assetSettingsLoaded = true;
	}

	watch(){
		console.log("watching for file changes in " + this.builtInAssetsPath);
		fsSync.watch(this.builtInAssetsPath, {recursive:true}, async (eventType, relPath) => {
			if(!this.assetSettingsLoaded) return;
			if(relPath == "assetSettings.json") return;
			const filename = path.basename(relPath);
			if(filename.startsWith(".")) return;
			const fullPath = path.resolve(this.builtInAssetsPath, relPath);
			let stat = null;
			try{
				stat = await fs.stat(fullPath);
			}catch(e){
				stat = null;
			}
			if(stat && stat.isDirectory()) return;

			const pathArr = relPath.split("/");
			let assetSettingsNeedsUpdate = false;
			let uuid = null;
			if(!stat){
				if(this.deleteAssetSettings(pathArr)){
					assetSettingsNeedsUpdate = true;
				}
			}else{
				if(this.getAssetSettingsUuidForPath(pathArr) == null){
					const fileBuffer = await fs.readFile(fullPath);
					const hash = md5(fileBuffer);
					if(this.fileHashes.has(hash)){
						uuid = this.fileHashes.get(hash);
						const assetSettings = this.assetSettings.get(uuid);
						if(assetSettings){
							assetSettings.path = pathArr;
						}else{
							this.assetSettings.set(uuid, {path: pathArr});
						}
					}else{
						uuid = this.createAssetSettings(pathArr);
					}
					assetSettingsNeedsUpdate = true;
				}
			}

			if(assetSettingsNeedsUpdate){
				this.saveAssetSettings();
			}

			if(!uuid){
				uuid = this.getAssetSettingsUuidForPath(pathArr);
			}

			if(uuid){
				sendAllConnections("builtInAssetChange", {
					uuid,
				});
			}
		});
	}

	async saveAssetSettings(notifySocket = true){
		if(!this.assetSettingsLoaded) return;
		const assets = {};
		for(const uuid of this.cachedUuidOrder){
			if(this.assetSettings.has(uuid)){
				assets[uuid] = this.assetSettings.get(uuid);
			}
		}
		for(const [uuid, assetSettings] of this.assetSettings){
			if(assets[uuid]) continue;
			assets[uuid] = assetSettings;
		}
		const json = {assets};
		const str = toFormattedJsonString(json, {maxArrayStringItemLength: -1});
		await fs.writeFile(this.assetSettingsPath, str);

		if(notifySocket){
			sendAllConnections("builtInAssetListUpdate");
		}
	}

	deleteAssetSettings(path){
		if(!this.assetSettingsLoaded) return false;
		let assetSettingsNeedsUpdate = false;
		for(const [uuid, assetSettings] of this.assetSettings){
			if(this.testPathStartsWith(assetSettings.path, path)){
				this.assetSettings.delete(uuid);
				assetSettingsNeedsUpdate = true;
			}
		}
		return assetSettingsNeedsUpdate;
	}

	createAssetSettings(path){
		const uuid = generateUuid();
		this.assetSettings.set(uuid, {path});
		return uuid;
	}

	testPathStartsWith(path, startsWithPath){
		if(path.length < startsWithPath.length) return false;
		for(const [i, name] of startsWithPath.entries()){
			if(path[i] != name) return false;
		}
		return true;
	}

	getAssetSettingsUuidForPath(path){
		for(const [uuid, assetSettings] of this.assetSettings){
			if(this.testPathMatch(path, assetSettings.path)){
				return uuid;
			}
		}
		return null;
	}

	testPathMatch(path1 = [], path2 = []){
		if(path1.length != path2.length) return false;
		for(let i=0; i<path1.length; i++){
			if(path1[i] != path2[i]) return false;
		}
		return true;
	}
}
