import {AssetBundle} from "./AssetBundle.js";

/**
 * An InspectorAssetBundle serves as a replacement for bundles which are normally used in production.
 * It is attached to an InspectorManager, allowing it to fetch assets directly from a Renda Studio instance.
 * This way, you won't need to generate a new asset bundle every time you change an asset.
 */
export class InspectorAssetBundle extends AssetBundle {
	/**
	 * @example
	 * ```js
	 * const inspector = new InspectorManager();
	 * const bundle = new InspectorAssetBundle(inspector);
	 *
	 * const assetLoader = new AssetLoader();
	 * assetLoader.addBundle(bundle);
	 * ```
	 * @param {import("../../inspector/InspectorManager.js").InspectorManager} inspectorManager
	 */
	constructor(inspectorManager) {
		super();
		/** @private */
		this._inspectorManager = inspectorManager;
	}

	/**
	 * @override
	 * @param {import("../../util/util.js").UuidString} uuid
	 */
	hasAsset(uuid) {
		return this._inspectorManager.requestHasAsset(uuid);
	}

	/**
	 * @override
	 * @param {import("../../util/util.js").UuidString} uuid
	 */
	waitForAssetAvailable(uuid) {
		return this.hasAsset(uuid);
	}

	/**
	 * @param {import("../../util/util.js").UuidString} uuid
	 */
	async getAsset(uuid) {
		return null;
	}
}
