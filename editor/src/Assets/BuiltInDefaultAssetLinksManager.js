import {autoRegisterBuiltInDefaultAssetLinks} from "./autoRegisterBuiltInDefaultAssetLinks.js";

export class BuiltInDefaultAssetLinksManager {
	constructor() {
		this.registeredAssetLinks = new Set();
	}

	init() {
		for (const assetLink of autoRegisterBuiltInDefaultAssetLinks) {
			this.registerAssetLink(assetLink);
		}
	}

	registerAssetLink(assetLink) {
		this.registeredAssetLinks.add(assetLink);
	}
}
