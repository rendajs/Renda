import defaultAssetLoader from "./defaultAssetLoader.js";
import {ENABLE_ENGINE_ASSETS_HANDLERS} from "../defines.js";

export default class EngineAssetsManager{
	constructor(){
		if(!ENABLE_ENGINE_ASSETS_HANDLERS) return;
		this.getAssetHandlers = new Set();

		this.watchingAssetCbs = new Map(); //<uuid, Set<cb>>
	}

	async getAsset(...args){
		if(ENABLE_ENGINE_ASSETS_HANDLERS){
			for(const handler of this.getAssetHandlers){
				const result = await handler(...args);
				if(result) return result;
			}
		}
		return await defaultAssetLoader.getAsset(...args);
	}

	async watchAsset(uuid, onAssetChangeCb){
		const asset = await this.getAsset(uuid);
		onAssetChangeCb(asset);
		if(ENABLE_ENGINE_ASSETS_HANDLERS){
			let cbs = this.watchingAssetCbs.get(uuid);
			if(!cbs){
				cbs = new Set();
				this.watchingAssetCbs.set(uuid, cbs);
			}
			cbs.add(onAssetChangeCb);
		}
	}

	addGetAssetHandler(handlerFunction){
		if(!ENABLE_ENGINE_ASSETS_HANDLERS) return;
		this.getAssetHandlers.add(handlerFunction);
	}

	async notifyAssetChanged(uuid){
		if(!ENABLE_ENGINE_ASSETS_HANDLERS) return;
		const cbs = this.watchingAssetCbs.get(uuid);
		if(cbs){
			const asset = await this.getAsset(uuid);
			for(const cb of cbs){
				cb(asset);
			}
		}
	}
}
