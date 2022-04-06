import {ENGINE_ASSETS_LIVE_UPDATES_SUPPORT} from "../engineDefines.js";

/** @typedef {Parameters<import("./AssetLoader.js").AssetLoader["getAsset"]>} GetAssetArgs */
/** @typedef {(...args: GetAssetArgs) => any} GetEngineAssetHandler */
/** @typedef {(asset: any) => any} WatchAssetCallback */

/**
 * This class is responsible for loading assets that are being used by the
 * engine itself. This class mostly exists so that we can reload assets when
 * they change during development of the editor.
 * When this code runs in release builds, `ENGINE_ASSETS_LIVE_UPDATES_SUPPORT`
 * is expected to be false. When that is the case this class functions as little
 * more than a wrapper around the `AssetLoader.getAsset()` method.
 * But when this is not the case, {@linkcode addGetAssetHandler} callbacks are
 * called for every {@linkcode getAsset} request. This allows you to hook into
 * the asset loading logic and load assets from a `BuiltInAssetManager`.
 */
export class EngineAssetsManager {
	/**
	 * @param {import("./AssetLoader.js").AssetLoader} assetLoader
	 */
	constructor(assetLoader) {
		this.assetLoader = assetLoader;
		if (!ENGINE_ASSETS_LIVE_UPDATES_SUPPORT) return;

		/** @type {Set<GetEngineAssetHandler>} */
		this.getAssetHandlers = new Set();

		/** @type {Map<import("../util.js").UuidString, Set<WatchAssetCallback>>} */
		this.watchingAssetCbs = new Map();
	}

	/**
	 * @param {GetAssetArgs} args
	 */
	async getAsset(...args) {
		if (ENGINE_ASSETS_LIVE_UPDATES_SUPPORT) {
			for (const handler of this.getAssetHandlers) {
				const result = await handler(...args);
				if (result) return result;
			}
		}
		return await this.assetLoader.getAsset(...args);
	}

	/**
	 * @param {import("../util/util.js").UuidString} uuid
	 * @param {WatchAssetCallback} onAssetChangeCb
	 */
	async watchAsset(uuid, onAssetChangeCb) {
		const asset = await this.getAsset(uuid);
		onAssetChangeCb(asset);
		if (ENGINE_ASSETS_LIVE_UPDATES_SUPPORT) {
			let cbs = this.watchingAssetCbs.get(uuid);
			if (!cbs) {
				cbs = new Set();
				this.watchingAssetCbs.set(uuid, cbs);
			}
			cbs.add(onAssetChangeCb);
		}
	}

	/**
	 * Adds a handler that gets called every time an engine asset is requested.
	 * The handler should return a live asset that will then be used by whatever
	 * engine part of the engine requested it.
	 * @param {GetEngineAssetHandler} handlerFunction
	 */
	addGetAssetHandler(handlerFunction) {
		if (!ENGINE_ASSETS_LIVE_UPDATES_SUPPORT) return;
		this.getAssetHandlers.add(handlerFunction);
	}

	/**
	 * Reloads any currently loaded assets that were loaded using {@linkcode watchAsset}.
	 * @param {import("../util.js").UuidString} uuid
	 */
	async notifyAssetChanged(uuid) {
		if (!ENGINE_ASSETS_LIVE_UPDATES_SUPPORT) return;
		const cbs = this.watchingAssetCbs.get(uuid);
		if (cbs) {
			const asset = await this.getAsset(uuid);
			for (const cb of cbs) {
				cb(asset);
			}
		}
	}
}
