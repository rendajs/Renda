import {AssetBundle} from "./AssetBundle.js";
import {AssetLoaderType} from "./assetLoaderTypes/AssetLoaderType.js";
import {isUuid} from "../util/util.js";
import {RecursionTracker} from "./RecursionTracker.js";

/**
 * @template {new (...args: any[]) => import("./assetLoaderTypes/AssetLoaderType.js").AssetLoaderType<any, any>} [TLoaderType = new (...args: any[]) => import("./assetLoaderTypes/AssetLoaderType.js").AssetLoaderType<any, any>]
 * @template {new (...args: any[]) => any} [TInstanceType = new (...args: any[]) => any]
 * @typedef AssetLoaderAssertionOptions
 * @property {TLoaderType | null} [assertLoaderType]
 * @property {TInstanceType | null} [assertInstanceType]
 */

/**
 * @typedef AssetLoaderAssertionOptionsDefaults
 * @property {null} assertLoaderType
 * @property {null} assertInstanceType
 */

/**
 * @template {AssetLoaderAssertionOptions} TAssertionOptions
 * @typedef AssetLoaderGetAssetOptions
 * @property {TAssertionOptions} [assertionOptions]
 * @property {unknown} [assetOpts]
 * @property {boolean} [createNewInstance]
 * @property {RecursionTracker?} [recursionTracker]
 */

/**
 * @template {AssetLoaderAssertionOptions} [T = AssetLoaderAssertionOptionsDefaults]
 * @typedef {T["assertInstanceType"] extends (new (...args: any[]) => infer ProjectAssetType) ?
 * 	ProjectAssetType :
 * T["assertLoaderType"] extends (new (...args: any[]) => AssetLoaderType<infer TReturnType, any>) ?
 * 	TReturnType :
 * unknown} AssetLoaderAssertionOptionsToReturnType
 */

/**
 * The AssetLoader is the main way to get assets from a Renda project inside a running application.
 * Typically you instantiate a single AssetLoader, which you can then add asset bundles to.
 * When requesting an asset, it will check all bundles to see if it contains the requested asset.
 * Once it finds it, it will load the asset using one of the provided loader types.
 */
export class AssetLoader {
	constructor() {
		/** @type {Set<AssetBundle>} */
		this.bundles = new Set();

		/** @type {Map<string, AssetLoaderType<unknown, unknown>>} */
		this.registeredLoaderTypes = new Map();

		/** @type {Map<import("../mod.js").UuidString, WeakRef<any>>} */
		this.loadedAssets = new Map();
	}

	/**
	 * @param {string} url
	 */
	addBundle(url) {
		const bundle = new AssetBundle(url);
		this.bundles.add(bundle);
		return bundle;
	}

	/**
	 * @template {AssetLoaderType<any, any>} TLoaderType
	 * @param {new (...args: any[]) => TLoaderType} constructor
	 * @returns {TLoaderType}
	 */
	registerLoaderType(constructor) {
		const castConstructor1 = /** @type {unknown} */ (constructor);
		const castConstructor2 = /** @type {typeof AssetLoaderType} */ (castConstructor1);
		// todo: remove these errors in release builds
		if (!(constructor.prototype instanceof AssetLoaderType)) {
			throw new Error(`Unable to register AssetLoaderType "${constructor.name}" because it doesn't extend the AssetLoaderType class.`);
		}
		if (!isUuid(castConstructor2.typeUuid)) {
			throw new Error(`Unable to register AssetLoaderType "${constructor.name}" because it doesn't have a valid uuid for the static 'typeUuid' set ("${castConstructor2.typeUuid}").`);
		}

		const instance = new constructor(this);
		this.registeredLoaderTypes.set(castConstructor2.typeUuid, instance);
		return instance;
	}

	// TODO: more options for deciding whether unfinished bundles should be searched as well
	// TODO: If an asset is already being loaded, resolve using the same promise
	// TODO: #613 Infer assetOpts from the `assertionOptions` loader type
	/**
	 * @template {AssetLoaderAssertionOptions} TAssertionOptions
	 * @param {import("../util/util.js").UuidString} uuid
	 * @param {AssetLoaderGetAssetOptions<TAssertionOptions>} options
	 */
	async getAsset(uuid, {
		assetOpts = undefined,
		createNewInstance = false,
		assertionOptions = /** @type {TAssertionOptions} */ ({}),
		recursionTracker = null,
	} = {}) {
		if (!createNewInstance) {
			const weakRef = this.loadedAssets.get(uuid);
			if (weakRef) {
				const ref = weakRef.deref();
				if (ref) {
					return /** @type {AssetLoaderAssertionOptionsToReturnType<TAssertionOptions>} */ (ref);
				}
			}
		}

		const isRootRecursionTracker = !recursionTracker;
		if (!recursionTracker) {
			recursionTracker = new RecursionTracker(this, uuid);
		}

		/** @type {AssetBundle?} */
		const bundleWithAsset = await new Promise((resolve, reject) => {
			if (this.bundles.size == 0) {
				resolve(null);
				return;
			}
			const searchCount = this.bundles.size;
			let unavailableCount = 0;
			for (const bundle of this.bundles) {
				bundle.waitForAssetAvailable(uuid).then(available => {
					if (available) {
						resolve(bundle);
					} else {
						unavailableCount++;
						if (unavailableCount >= searchCount) {
							resolve(null);
						}
					}
				}).catch(reject);
			}
		});
		if (!bundleWithAsset) {
			// todo: remove this error in release builds
			throw new Error(`Tried to load an asset with uuid ${uuid} but the uuid wasn't found in any AssetBundle.`);
		}
		const assetData = await bundleWithAsset.getAsset(uuid);
		if (!assetData) throw new Error("Assertion failed, expected bundle to return asset data.");
		const {buffer, type} = assetData;

		const loaderType = this.registeredLoaderTypes.get(type);
		if (!loaderType) {
			// todo: remove this error in release builds
			throw new Error(`Unable to parse asset with uuid "${uuid}". Its type is not registered, register it first with AssetLoader.registerLoaderType().`);
		}
		if (assertionOptions.assertLoaderType && !(loaderType instanceof assertionOptions.assertLoaderType)) {
			throw new Error("The asset did not have the expected assertLoaderType.");
		}

		const asset = await loaderType.parseBuffer(buffer, recursionTracker, assetOpts);

		if (assertionOptions.assertInstanceType && !(asset instanceof assertionOptions.assertInstanceType)) {
			throw new Error("The asset did not have the expected assertInstanceType.");
		}

		if (!createNewInstance) {
			// TODO: #611 Improve the error message when the asset is a string, null, number etc.
			const weakRef = new WeakRef(/** @type {object} */ (asset));
			this.loadedAssets.set(uuid, weakRef);
		}

		if (isRootRecursionTracker) {
			recursionTracker.setRootLoadedAsset(asset);
			await recursionTracker.waitForAll();
		}

		return /** @type {AssetLoaderAssertionOptionsToReturnType<TAssertionOptions>} */ (asset);
	}
}
