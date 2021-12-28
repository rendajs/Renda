export class LoadingAsset {
	/**
	 * @param {import("../../../../src/util/mod.js").UuidString} uuid
	 */
	constructor(uuid) {
		this.uuid = uuid;

		this.isLoaded = false;
		this.loadedAssetData = null;

		/** @type {Set<(liveAssetData: import("../ProjectAssetType/ProjectAssetType.js").LiveAssetDataAny?) => void>} */
		this.onLoadCbs = new Set();
	}

	/**
	 * @param {import("./RecursionTracker.js").RecursionTracker} recursionTracker
	 * @param {import("../AssetManager.js").AssetManager} assetManager
	 */
	async startLoading(recursionTracker, assetManager) {
		const loadedAssetData = await assetManager.getLiveAssetData(this.uuid, recursionTracker);
		this.setLoadedAssetData(loadedAssetData);
	}

	/**
	 * @param {(liveAssetData: import("../ProjectAssetType/ProjectAssetType.js").LiveAssetDataAny?) => void} cb
	 */
	onLoad(cb) {
		if (this.isLoaded) {
			cb(this.loadedAssetData);
		} else {
			this.onLoadCbs.add(cb);
		}
	}

	async waitForLoad() {
		await new Promise(r => this.onLoad(r));
	}

	/**
	 * @param {import("../ProjectAssetType/ProjectAssetType.js").LiveAssetDataAny?} loadedAssetData
	 */
	setLoadedAssetData(loadedAssetData) {
		this.loadedAssetData = loadedAssetData;
		this.isLoaded = true;
		this.onLoadCbs.forEach(cb => cb(this.loadedAssetData));
		this.onLoadCbs.clear();
	}
}
