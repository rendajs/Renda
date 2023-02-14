import {autoRegisterBuiltInDefaultAssetLinks} from "./autoRegisterBuiltInDefaultAssetLinks.js";

export class BuiltInDefaultAssetLinksManager {
	constructor() {
		/** @type {Set<import("./autoRegisterBuiltInDefaultAssetLinks.js").BuiltInDefaultAssetLink>} */
		this.registeredAssetLinks = new Set();
	}

	init() {
		for (const assetLink of autoRegisterBuiltInDefaultAssetLinks) {
			this.registerAssetLink(assetLink);
		}
	}

	/**
	 * @param {import("./autoRegisterBuiltInDefaultAssetLinks.js").BuiltInDefaultAssetLink} assetLink
	 */
	registerAssetLink(assetLink) {
		this.registeredAssetLinks.add(assetLink);
	}
}
