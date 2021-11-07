import {LoadingAsset} from "./LoadingAsset.js";

export class RecursionTracker {
	/**
	 * @param {import("../AssetManager.js").default} assetManager
	 * @param {import("../../Util/Util.js").UuidString} rootUuid
	 */
	constructor(assetManager, rootUuid) {
		this.assetManager = assetManager;
		this.rootUuid = rootUuid;

		/** @type {LoadingAsset} */
		this.rootLoadingAsset = null;

		/** @type {Map<import("../../Util/Util.js").UuidString, LoadingAsset>} */
		this.loadingLiveAssets = new Map();
	}

	/**
	 * @param {import("../../Util/Util.js").UuidString} uuid
	 * @param {(liveAssetData: import("../ProjectAssetType/ProjectAssetType.js").LiveAssetData) => void} cb
	 */
	getLiveAssetData(uuid, cb) {
		let loadingAsset = this.loadingLiveAssets.get(uuid);
		if (!loadingAsset) {
			loadingAsset = new LoadingAsset(uuid);
			this.loadingLiveAssets.set(uuid, loadingAsset);
			if (uuid != this.rootUuid) {
				loadingAsset.startLoading(this, this.assetManager);
			} else {
				this.rootLoadingAsset = loadingAsset;
			}
		}
		loadingAsset.onLoad(cb);
	}

	/**
	 * @param {import("../../Util/Util.js").UuidString} uuid
	 * @param {(liveAsset: *) => void} cb
	 */
	getLiveAsset(uuid, cb) {
		this.getLiveAssetData(uuid, liveAssetData => {
			cb(liveAssetData.liveAsset);
		});
	}

	async waitForAll() {
		const promises = [];
		for (const loadingAsset of this.loadingLiveAssets.values()) {
			promises.push(loadingAsset.waitForLoad());
		}
		await Promise.all(promises);
	}
}
