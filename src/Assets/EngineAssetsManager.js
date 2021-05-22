import defaultAssetLoader from "./defaultAssetLoader.js";
import {ENABLE_ENGINE_ASSETS_HANDLERS} from "../defines.js";

export default class EngineAssetsManager{
	constructor(){
		if(!ENABLE_ENGINE_ASSETS_HANDLERS) return;
		this.getAssetHandlers = new Set();
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

	addGetAssetHandler(handlerFunction){
		if(!ENABLE_ENGINE_ASSETS_HANDLERS) return;
		this.getAssetHandlers.add(handlerFunction);
	}
}
