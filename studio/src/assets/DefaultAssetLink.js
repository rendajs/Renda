/**
 * @typedef {object} AssetLinkConfig
 * @property {string?} [name]
 * @property {import("../../../src/util/mod.js").UuidString?} [originalAssetUuid]
 */

export class DefaultAssetLink {
	/**
	 * @param {AssetLinkConfig} assetLinkConfig
	 */
	constructor({
		name = "",
		originalAssetUuid = null,
	} = {}) {
		this.name = name;
		this.originalAssetUuid = originalAssetUuid;
		/** @type {import("../../../src/mod.js").UuidString?} */
		this.builtInOriginalAssetUuid = null;
		this.isBuiltIn = false;
	}

	/**
	 * @param {boolean} builtIn
	 */
	setBuiltIn(builtIn) {
		this.isBuiltIn = builtIn;
		this.builtInOriginalAssetUuid = this.originalAssetUuid;
	}

	/**
	 * @param {AssetLinkConfig} data
	 */
	setUserData({name, originalAssetUuid}) {
		if (!this.isBuiltIn) {
			this.name = name ?? "";
		}
		this.originalAssetUuid = originalAssetUuid ?? null;
	}

	toJson() {
		const json = {};
		if (this.isBuiltIn) {
			if (this.originalAssetUuid == this.builtInOriginalAssetUuid) return null;
		} else if (this.name) {
			json.name = this.name;
		}
		if (this.originalAssetUuid) json.originalAssetUuid = this.originalAssetUuid;
		return json;
	}
}
