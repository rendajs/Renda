export class LoadingAsset {
	/**
	 * @param {import("../../Util/Util.js").UuidString} uuid
	 */
	constructor(uuid) {
		this.uuid = uuid;

		this.isLoaded = false;
		this.loadedAssetData = null;

		/** @type {Set<(liveAssetData: import("../ProjectAssetType/ProjectAssetType.js").LiveAssetData) => void>} */
		this.onLoadCbs = new Set();
	}

	/**
	 * @param {import("./RecursionTracker.js").RecursionTracker} recursionTracker
	 * @param {import("../AssetManager.js").default} assetManager
	 */
	async startLoading(recursionTracker, assetManager) {
		const loadedAssetData = await assetManager.getLiveAssetData(this.uuid, recursionTracker);
		this.setLoadedAssetData(loadedAssetData);
	}

	/**
	 * @param {(liveAssetData: import("../ProjectAssetType/ProjectAssetType.js").LiveAssetData) => void} cb
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

	setLoadedAssetData(loadedAssetData) {
		this.loadedAssetData = loadedAssetData;
		this.isLoaded = true;
		this.onLoadCbs.forEach(cb => cb(this.loadedAssetData));
		this.onLoadCbs.clear();
	}
}
