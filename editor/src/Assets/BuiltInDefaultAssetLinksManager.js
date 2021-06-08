import autoRegisterDefaultAssetLinks from "./AutoRegisterBuiltInDefaultAssetLinks.js";

export default class BuiltInDefaultAssetLinksManager{
	constructor(){
		this.registeredAssetLinks = new Set();
	}

	init(){
		for(const assetLink of autoRegisterDefaultAssetLinks){
			this.registerAssetLink(assetLink);
		}
	}

	registerAssetLink(assetLink){
		this.registeredAssetLinks.add(assetLink);
	}
}
