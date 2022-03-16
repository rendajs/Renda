import {LoadingAsset} from "./LoadingAsset.js";

{
	/** @typedef {import("../ProjectAssetType/ProjectAssetType.js").ProjectAssetType} ProjectAssetType */
}

/* eslint-disable jsdoc/require-description-complete-sentence */
/**
 * @typedef {Object} GetLiveAssetDataOptions
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
 * @template {import("../projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} T
 * @typedef {T extends import("../projectAssetType/ProjectAssetType.js").ProjectAssetType<infer U, any, any> ? U :never} LiveAssetType
 */
/**
 * @template {import("../projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} T
 * @typedef {T extends import("../projectAssetType/ProjectAssetType.js").ProjectAssetType<any, infer U, any> ? U :never} EditorDataType
 */
/**
 * @template {import("../projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} T
 * @typedef {import("../projectAssetType/ProjectAssetType.js").LiveAssetData<LiveAssetType<T>, EditorDataType<T>>} LiveAssetData
 */

/**
 * @template {import("../projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} TProjectAssetType
 * @typedef {(liveAssetData: LiveAssetData<TProjectAssetType>?) => void} LiveAssetDataCallback
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
	 * @template {import("../projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} TProjectAssetType
	 * @param {import("../../../../src/util/mod.js").UuidString} uuid
	 * @param {LiveAssetDataCallback<TProjectAssetType>} cb
	 * @param {GetLiveAssetDataOptions} options
	 */
	getLiveAssetData(uuid, cb, {
		repeatOnLiveAssetChange = false,
	} = {}) {
		if (repeatOnLiveAssetChange) {
			/**
			 * Since this is the most recent ProjectAsset, this is essentially
			 * the ProjectAsset that `getLiveAssetData()` is called from.
			 */
			const currentProjectAsset = this.projectAssetStack[this.projectAssetStack.length - 1];
			currentProjectAsset.registerRecursionTrackerLiveAssetChange(this.assetManager, uuid, cb);
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
		loadingAsset.onLoad(cb);
	}

	/**
	 * @param {import("../../../../src/util/mod.js").UuidString} uuid
	 * @param {(liveAsset: *) => void} cb
	 * @param {GetLiveAssetDataOptions} options
	 */
	getLiveAsset(uuid, cb, options = {}) {
		this.getLiveAssetData(uuid, liveAssetData => {
			cb(liveAssetData?.liveAsset ?? null);
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
