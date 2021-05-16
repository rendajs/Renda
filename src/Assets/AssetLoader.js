import AssetBundle from "./AssetBundle.js";
import AssetLoaderType from "./AssetLoaderTypes/AssetLoaderType.js";
import {isUuid} from "../Util/Util.js";

export default class AssetLoader{
	constructor(){
		this.bundles = new Set();

		this.registeredLoaderTypes = new Map();

		this.loadedAssets = new Map(); //Map<uuid, WeakRef<asset>>
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

	async getAsset(uuid, opts = undefined, createNewInstance = false){
		if(!createNewInstance){
			const weakRef = this.loadedAssets.get(uuid);
			if(weakRef){
				const ref = weakRef.deref();
				if(ref){
					return ref;
				}
			}
		}
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

		const asset = await loaderType.parseBuffer(buffer, opts);

		if(!createNewInstance){
			const weakRef = new WeakRef(asset);
			this.loadedAssets.set(uuid, weakRef);
		}

		return asset;
	}
}
