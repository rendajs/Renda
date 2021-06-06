import autoRegisterAssetLinks from "./AutoRegisterBuiltInAssetLinks.js";

export default class BuiltInDefaultAssetLinksManager{
	constructor(){
		this.registeredAssetLinks = new Set();
	}

	init(){
		for(const assetLink of autoRegisterAssetLinks){
			this.registerAssetLink(assetLink);
		}
	}

	registerAssetLink(assetLink){
		this.registeredAssetLinks.add(assetLink);
	}
}
