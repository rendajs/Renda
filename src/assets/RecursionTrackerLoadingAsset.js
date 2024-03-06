export class RecursionTrackerLoadingAsset {
	/**
	 * @param {import("../mod.js").UuidString} uuid
	 */
	constructor(uuid) {
		this.uuid = uuid;

		this.isLoaded = false;
		this.loadedAsset = null;

		/** @private @type {Set<(asset: unknown) => void>} */
		this.onLoadCbs = new Set();
	}

	/**
	 * @param {import("./RecursionTracker.js").RecursionTracker} recursionTracker
	 * @param {import("./AssetLoader.js").AssetLoader} assetLoader
	 */
	async startLoading(recursionTracker, assetLoader) {
		const asset = await assetLoader.getAsset(this.uuid, {
			recursionTracker,
		});
		this.setLoadedAsset(asset);
	}

	/**
	 * @param {(asset: unknown) => void} cb
	 */
	onLoad(cb) {
		if (this.isLoaded) {
			cb(this.loadedAsset);
		} else {
			this.onLoadCbs.add(cb);
		}
	}

	async waitForLoad() {
		await new Promise((r) => this.onLoad(r));
	}

	/**
	 * @param {unknown} loadedAsset
	 */
	setLoadedAsset(loadedAsset) {
		this.loadedAsset = loadedAsset;
		this.isLoaded = true;
		this.onLoadCbs.forEach((cb) => cb(this.loadedAsset));
		this.onLoadCbs.clear();
	}
}
