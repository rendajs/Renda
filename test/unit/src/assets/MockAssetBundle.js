export class MockAssetBundle {
	/** @type {Set<import("../../../../src/mod.js").UuidString>} */
	#availableAssets = new Set();
	/**
	 * @param {string} url
	 */
	constructor(url) {
		this.url = url;
		/** @type {Map<import("../../../../src/mod.js").UuidString, Set<(available: boolean) => void>>} */
		this.onAssetAvailableCbs = new Map();
		/** @type {Map<import("../../../../src/mod.js").UuidString, import("../../../../src/mod.js").UuidString>} */
		this.mockAssetTypes = new Map();
		/** @type {Map<import("../../../../src/mod.js").UuidString, ArrayBuffer>} */
		this.mockAssetBuffers = new Map();
	}

	/**
	 * @param {import("../../../../src/mod.js").UuidString} uuid
	 */
	async waitForAssetAvailable(uuid) {
		if (this.#availableAssets.has(uuid)) return true;
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
	 * @param {boolean} [available]
	 */
	setAssetAvailable(uuid, available = true) {
		if (available) {
			this.#availableAssets.add(uuid);
		} else {
			this.#availableAssets.delete(uuid);
		}
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
	 * Sets the array buffer that should be returned in {@linkcode getAsset}.
	 * @param {import("../../../../src/mod.js").UuidString} assetUuid
	 * @param {ArrayBuffer?} buffer
	 */
	setAssetBuffer(assetUuid, buffer) {
		if (buffer) {
			this.mockAssetBuffers.set(assetUuid, buffer);
		} else {
			this.mockAssetBuffers.delete(assetUuid);
		}
	}

	/**
	 * @param {import("../../../../src/mod.js").UuidString} uuid
	 */
	getAsset(uuid) {
		const type = this.mockAssetTypes.get(uuid);
		if (!type) return null;
		const buffer = this.mockAssetBuffers.get(uuid) || new ArrayBuffer(0);
		return {buffer, type};
	}
}

/**
 * @param {import("../../../../src/assets/AssetBundle.js").AssetBundle} assetBundle
 */
export function castMock(assetBundle) {
	const cast = /** @type {unknown} */ (assetBundle);
	return /** @type {MockAssetBundle} */ (cast);
}

export {MockAssetBundle as AssetBundle};
