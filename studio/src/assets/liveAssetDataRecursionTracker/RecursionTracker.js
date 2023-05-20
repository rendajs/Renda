import {AssetManager} from "../AssetManager.js";
import {LoadingAsset} from "./LoadingAsset.js";

{
	/** @typedef {import("../projectAssetType/ProjectAssetType.js").ProjectAssetType} ProjectAssetType */
}

/* eslint-disable jsdoc/require-description-complete-sentence */
/**
 * @typedef {object} GetLiveAssetDataOptionsExtra
 * @property {boolean} [repeatOnLiveAssetChange = false] Repeats the callback if the live asset changes.
 * This is useful when your callback assigns the live asset to an object. Repeat calls will
 * cause the property to be overwritten. This only works when code doesn't make assumptions about
 * a permanent value of the property. E.g. a material asset can change and the renderer
 * will happily comply. Because materials are expected to be changable from user code. But shader
 * source live assets for instance are heavily cached, because we can't recompile a shader every
 * time it's needed for rendering an object. So replacing shader source live assets won't work
 * with this method because cache wouldn't be invalidated.
 *
 * In such a case you should opt for {@linkcode ProjectAssetType.liveAssetNeedsReplacement} or
 * {@linkcode ProjectAssetType.listenForUsedLiveAssetChanges}. This will completely replace the
 * live asset with a newly generated one. This will invalidate caches and propagate up to
 * any live assets that are able to dynamically replace live asset properties.
 */
/* eslint-enable jsdoc/require-description-complete-sentence */

/**
 * @typedef {import("../AssetManager.js").AssetAssertionOptions<new (...args: any[]) => import("../projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny> & GetLiveAssetDataOptionsExtra} GetLiveAssetDataOptions
 */

/**
 * @template {GetLiveAssetDataOptions} TOpts
 * @typedef {TOpts extends import("../projectAssetType/ProjectAssetType.js").ProjectAssetType<infer U, any, any> ? U :never} LiveAssetType
 */
/**
 * @template {GetLiveAssetDataOptions} TOpts
 * @typedef {TOpts extends import("../projectAssetType/ProjectAssetType.js").ProjectAssetType<any, infer U, any> ? U :never} StudioDataType
 */
/**
 * @template {GetLiveAssetDataOptions} TOpts
 * @typedef {import("../projectAssetType/ProjectAssetType.js").LiveAssetData<LiveAssetType<TOpts>, StudioDataType<TOpts>>} LiveAssetData
 */

/**
 * @template {GetLiveAssetDataOptions} TOpts
 * @typedef {(liveAssetData: LiveAssetData<TOpts>?) => void} LiveAssetDataCallback
 */

export class RecursionTracker {
	/**
	 * @param {import("../AssetManager.js").AssetManager} assetManager
	 * @param {import("../../../../src/util/mod.js").UuidString} rootUuid
	 */
	constructor(assetManager, rootUuid) {
		this.assetManager = assetManager;
		this.rootUuid = rootUuid;

		/** @typedef {import("../ProjectAsset.js").ProjectAssetAny} ProjectAsset */

		/**
		 * Stack for keeping track what the currently loading ProjectAsset is.
		 * Used for assigning {@linkcode ProjectAsset.onLiveAssetNeedsReplacement} callbacks
		 * to the correct ProjectAsset instance. This way the callbacks can be properly
		 * unregistered when the ProjectAsset is destroyed.
		 * @type {ProjectAsset[]}
		 */
		this.projectAssetStack = [];

		/** @type {LoadingAsset?} */
		this.rootLoadingAsset = null;

		/** @type {Map<import("../../../../src/util/mod.js").UuidString, LoadingAsset>} */
		this.loadingLiveAssets = new Map();
	}

	/**
	 * @param {import("../ProjectAsset.js").ProjectAssetAny} projectAsset
	 */
	pushProjectAssetToStack(projectAsset) {
		this.projectAssetStack.push(projectAsset);
	}

	popProjectAssetFromStack() {
		this.projectAssetStack.pop();
	}

	/**
	 * @template {GetLiveAssetDataOptions} [T = {}]
	 * @param {import("../../../../src/util/mod.js").UuidString} uuid
	 * @param {LiveAssetDataCallback<T>} cb
	 * @param {T} options
	 */
	getLiveAssetData(uuid, cb, {
		repeatOnLiveAssetChange = false,
		assertAssetType = null,
	} = /** @type {T} */ ({})) {
		/** @type {LiveAssetDataCallback<T>} */
		const wrapperCallback = liveAssetData => {
			if (assertAssetType && liveAssetData) {
				const projectAsset = this.assetManager.getProjectAssetFromUuidSync(uuid);
				if (!projectAsset) {
					cb(null);
					return;
				}
				try {
					AssetManager.assertProjectAssetIsType(projectAsset.projectAssetTypeConstructorSync, assertAssetType);
				} catch (err) {
					console.error(err);
					cb(null);
					return;
				}
			}
			cb(liveAssetData);
		};
		if (repeatOnLiveAssetChange) {
			/**
			 * Since this is the most recent ProjectAsset, this is essentially
			 * the ProjectAsset that `getLiveAssetData()` is called from.
			 */
			const currentProjectAsset = this.projectAssetStack[this.projectAssetStack.length - 1];
			currentProjectAsset.registerRecursionTrackerLiveAssetChange(this.assetManager, uuid, wrapperCallback);
		}

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
		loadingAsset.onLoad(wrapperCallback);
	}

	/**
	 * @template {GetLiveAssetDataOptions} [T = {}]
	 * @param {import("../../../../src/util/mod.js").UuidString} uuid
	 * @param {(liveAsset: import("../AssetManager.js").AssetAssertionOptionsToLiveAsset<T>?) => void} cb
	 * @param {T} options
	 */
	getLiveAsset(uuid, cb, options = /** @type {T} */ ({})) {
		this.getLiveAssetData(uuid, liveAssetData => {
			const liveAsset = liveAssetData?.liveAsset ?? null;
			const castLiveAsset = /** @type {import("../AssetManager.js").AssetAssertionOptionsToLiveAsset<T>?} */ (liveAsset);
			cb(castLiveAsset);
		}, options);
	}

	async waitForAll() {
		const promises = [];
		for (const loadingAsset of this.loadingLiveAssets.values()) {
			promises.push(loadingAsset.waitForLoad());
		}
		await Promise.all(promises);
	}
}
