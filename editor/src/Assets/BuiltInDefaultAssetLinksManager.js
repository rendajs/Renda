import {autoRegisterBuiltInDefaultAssetLinks} from "./autoRegisterBuiltInDefaultAssetLinks.js";

/**
 * @typedef {Object} AssetLinkConfig
 * @property {string} name
 * @property {import("../../../src/util/mod.js").UuidString} defaultAssetUuid
 * @property {import("../../../src/util/mod.js").UuidString} originalAssetUuid
 */

export class BuiltInDefaultAssetLinksManager {
	constructor() {
		/** @type {Set<AssetLinkConfig>} */
		this.registeredAssetLinks = new Set();
	}

	init() {
		for (const assetLink of autoRegisterBuiltInDefaultAssetLinks) {
			this.registerAssetLink(assetLink);
		}
	}

	/**
	 * @param {AssetLinkConfig} assetLink
	 */
	registerAssetLink(assetLink) {
		this.registeredAssetLinks.add(assetLink);
	}
}
