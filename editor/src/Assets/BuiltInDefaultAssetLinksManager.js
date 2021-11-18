import autoRegisterDefaultAssetLinks from "./autoRegisterBuiltInDefaultAssetLinks1.js";

export default class BuiltInDefaultAssetLinksManager {
	constructor() {
		this.registeredAssetLinks = new Set();
	}

	init() {
		for (const assetLink of autoRegisterDefaultAssetLinks) {
			this.registerAssetLink(assetLink);
		}
	}

	registerAssetLink(assetLink) {
		this.registeredAssetLinks.add(assetLink);
	}
}
