import defaultAssetLoader from "./defaultAssetLoader.js";

export default class EngineAssetsManager{
	constructor(){
		this.getAssetHandlers = new Set();
	}

	async getAsset(...args){
		for(const handler of this.getAssetHandlers){
			const result = await handler(...args);
			if(result) return result;
		}
		return await defaultAssetLoader.getAsset(...args);
	}

	addGetAssetHandler(handlerFunction){
		this.getAssetHandlers.add(handlerFunction);
	}
}
