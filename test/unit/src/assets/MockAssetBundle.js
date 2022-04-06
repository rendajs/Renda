export class MockAssetBundle {
	/**
	 * @param {string} url
	 */
	constructor(url) {
		this.url = url;
		/** @type {Map<import("../../../../src/mod.js").UuidString, Set<(available: boolean) => void>>} */
		this.onAssetAvailableCbs = new Map();
		/** @type {Map<import("../../../../src/mod.js").UuidString, import("../../../../src/mod.js").UuidString>} */
		this.mockAssetTypes = new Map();
	}

	/**
	 * @param {import("../../../../src/mod.js").UuidString} uuid
	 */
	async waitForAssetAvailable(uuid) {
		/** @type {Promise<boolean>} */
		const promise = new Promise(r => {
			let cbs = this.onAssetAvailableCbs.get(uuid);
			if (!cbs) {
				cbs = new Set();
				this.onAssetAvailableCbs.set(uuid, cbs);
			}
			cbs.add(r);
		});
		return await promise;
	}

	/**
	 * @param {import("../../../../src/mod.js").UuidString} uuid
	 * @param {boolean} available
	 */
	triggerAssetAvailable(uuid, available) {
		const cbs = this.onAssetAvailableCbs.get(uuid);
		if (cbs) {
			cbs.forEach(cb => cb(available));
		}
	}

	/**
	 * @param {import("../../../../src/mod.js").UuidString} assetUuid
	 * @param {import("../../../../src/mod.js").UuidString} typeUuid
	 */
	setAssetType(assetUuid, typeUuid) {
		this.mockAssetTypes.set(assetUuid, typeUuid);
	}

	/**
	 * @param {import("../../../../src/mod.js").UuidString} uuid
	 */
	getAsset(uuid) {
		const type = this.mockAssetTypes.get(uuid);
		if (!type) return null;
		const buffer = new ArrayBuffer(0);
		return {buffer, type};
	}
}

/**
 * @param {import("../../../../src/Assets/AssetBundle.js").AssetBundle} assetBundle
 */
export function castMock(assetBundle) {
	const cast = /** @type {unknown} */ (assetBundle);
	return /** @type {MockAssetBundle} */ (cast);
}

export {MockAssetBundle as AssetBundle};
