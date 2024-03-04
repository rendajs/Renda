import { RecursionTrackerLoadingAsset } from "./RecursionTrackerLoadingAsset.js";

/**
 * When two assets refer to each other with an uuid, we want `AssetLoader.getAsset()`
 * to resolve once the entire chain of assets have been loaded. However, it is
 * possible for assets to refer to each other in a circular way. When loading
 * these the naive way, we can end up in an infinite loop and the promise from
 * `AssetLoader.getAsset()` will never resolve.
 * To prevent this, instead of having the asset loading algorithms load other
 * assets using the same `AssetLoader.getAsset()` method, we use a recursion
 * tracker and pass it as an argument. Then all the algorithms can use it to
 * load other assets. Instead of resolving a promise, we use a callback.
 * This is in case a circular reference is detected, we first load all the assets
 * and then fire all the callbacks. Inside the callback an asset loader can assign
 * the loaded asset to a property of another asset, completing the chain.
 */
export class RecursionTracker {
	/**
	 * @param {import("./AssetLoader.js").AssetLoader} assetLoader
	 * @param {import("../mod.js").UuidString} rootUuid
	 */
	constructor(assetLoader, rootUuid) {
		this.assetLoader = assetLoader;
		this.rootUuid = rootUuid;

		/** @private */
		this.rootLoadingAsset = new RecursionTrackerLoadingAsset(rootUuid);

		/** @private @type {Map<import("../mod.js").UuidString, RecursionTrackerLoadingAsset>} */
		this.loadingAssets = new Map();
		this.loadingAssets.set(rootUuid, this.rootLoadingAsset);
	}

	/**
	 * @param {import("../mod.js").UuidString} uuid
	 * @param {(asset: unknown) => void} cb
	 */
	getAsset(uuid, cb) {
		let loadingAsset = this.loadingAssets.get(uuid);
		if (!loadingAsset) {
			loadingAsset = new RecursionTrackerLoadingAsset(uuid);
			this.loadingAssets.set(uuid, loadingAsset);
			loadingAsset.startLoading(this, this.assetLoader);
		}
		loadingAsset.onLoad(cb);
	}

	/**
	 * In case any child assets contain a reference back to the root asset,
	 * this notifies the callbacks of the child assets, causing the root asset
	 * to get applied to properties of the child assets.
	 * @param {unknown} asset
	 */
	setRootLoadedAsset(asset) {
		this.rootLoadingAsset.setLoadedAsset(asset);
	}

	/**
	 * Resolves when the asset and all its children have loaded.
	 */
	async waitForAll() {
		const promises = [];
		for (const loadingAsset of this.loadingAssets.values()) {
			promises.push(loadingAsset.waitForLoad());
		}
		await Promise.all(promises);
	}
}
