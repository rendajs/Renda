import AssetBundle from "./AssetBundle.js";
import AssetLoaderType from "./AssetLoaderTypes/AssetLoaderType.js";
import {isUuid} from "../Util/Util.js";

export default class AssetLoader{
	constructor(){
		this.bundles = new Set();

		this.registeredLoaderTypes = new Map();
	}

	addBundle(url){
		const bundle = new AssetBundle(url);
		this.bundles.add(bundle);
		return bundle;
	}

	registerLoaderType(constructor){
		//todo: remove these warnings in release builds
		if(!(constructor.prototype instanceof AssetLoaderType)){
			console.warn("Tried to register AssetLoaderType ("+constructor.name+") that does not extend the AssetLoaderType class.");
			return;
		}
		if(!isUuid(constructor.typeUuid)){
			console.warn("Tried to register AssetLoaderType ("+constructor.name+") without a valid typeUuid value, override the static type value in order for this loader to function properly.");
			return;
		}

		const instance = new constructor(this);
		this.registeredLoaderTypes.set(constructor.typeUuid, instance);
		return instance;
	}

	async getAsset(uuid, opts = null){
		const bundleWithAsset = await new Promise((resolve, reject) => {
			let unavailableCount = 0;
			for(const bundle of this.bundles){
				bundle.waitForAssetAvailable(uuid).then(available => {
					if(available){
						resolve(bundle);
					}else{
						unavailableCount++;
						if(unavailableCount >= this.bundles.size){
							resolve(null);
						}
					}
				}).catch(reject);
			}
		});
		if(!bundleWithAsset) return null;
		const {buffer, type} = await bundleWithAsset.getAsset(uuid);

		const loaderType = this.registeredLoaderTypes.get(type);
		if(!loaderType){
			//todo: remove this warning in release builds
			console.warn("Unable to parse asset with uuid "+uuid+". It's type is not registered, register asset loader types with AssetLoader.registerLoaderType().");
			return null;
		}

		return await loaderType.parseBuffer(buffer, opts);
	}
}
