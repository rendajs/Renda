export class LoadingAsset {
	/**
	 * @param {import("../../../../src/util/mod.js").UuidString} uuid
	 */
	constructor(uuid) {
		this.uuid = uuid;

		this.isLoaded = false;
		this.loadedAssetData = null;

		/** @type {Set<(liveAssetData: import("../projectAssetType/ProjectAssetType.js").LiveAssetDataAny?) => void>} */
		this.onLoadCbs = new Set();
	}

	/**
	 * @param {import("./RecursionTracker.js").RecursionTracker} recursionTracker
	 * @param {import("../AssetManager.js").AssetManager} assetManager
	 */
	async startLoading(recursionTracker, assetManager) {
		const projectAsset = await assetManager.getProjectAssetFromUuid(this.uuid);
		if (!projectAsset) {
			this.setLoadedAssetData(null);
			return;
		}
		const liveAssetData = await projectAsset.getLiveAssetData(recursionTracker);
		this.setLoadedAssetData(liveAssetData);
	}

	/**
	 * @param {(liveAssetData: import("../projectAssetType/ProjectAssetType.js").LiveAssetDataAny?) => void} cb
	 */
	onLoad(cb) {
		if (this.isLoaded) {
			cb(this.loadedAssetData);
		} else {
			this.onLoadCbs.add(cb);
		}
	}

	async waitForLoad() {
		await new Promise((r) => this.onLoad(r));
	}

	/**
	 * @param {import("../projectAssetType/ProjectAssetType.js").LiveAssetDataAny?} loadedAssetData
	 */
	setLoadedAssetData(loadedAssetData) {
		this.loadedAssetData = loadedAssetData;
		this.isLoaded = true;
		this.onLoadCbs.forEach((cb) => cb(this.loadedAssetData));
		this.onLoadCbs.clear();
	}
}
