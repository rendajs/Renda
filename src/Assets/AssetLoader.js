import {AssetBundle} from "./AssetBundle.js";
import {AssetLoaderType} from "./AssetLoaderTypes/AssetLoaderType.js";
import {isUuid} from "../util/util.js";

export class AssetLoader {
	constructor() {
		this.bundles = new Set();

		/** @type {Map<string, AssetLoaderType>} */
		this.registeredLoaderTypes = new Map();

		this.loadedAssets = new Map(); // Map<uuid, WeakRef<asset>>
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
	 * @template {AssetLoaderType} TLoaderType
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

	// todo: more options for deciding whether unfinished bundles
	// should be searched as well
	/**
	 *
	 * @param {import("../util/mod.js").UuidString} uuid
	 * @param {Object} [options]
	 * @param {unknown} [options.assetOpts]
	 * @param {boolean} [options.createNewInstance]
	 */
	async getAsset(uuid, {
		assetOpts = undefined,
		createNewInstance = false,
	} = {}) {
		if (!createNewInstance) {
			const weakRef = this.loadedAssets.get(uuid);
			if (weakRef) {
				const ref = weakRef.deref();
				if (ref) {
					return ref;
				}
			}
		}
		/** @type {AssetBundle} */
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
			// todo: remove this warning in release builds and add a way to suppress the warning
			console.warn(`Tried to load an asset with uuid ${uuid} but the uuid wasn't found in any AssetBundles.`);
			return null;
		}
		const {buffer, type} = await bundleWithAsset.getAsset(uuid);

		const loaderType = this.registeredLoaderTypes.get(type);
		if (!loaderType) {
			// todo: remove this warning in release builds
			console.warn("Unable to parse asset with uuid " + uuid + ". It's type is not registered, register asset loader types with AssetLoader.registerLoaderType().");
			return null;
		}

		const asset = await loaderType.parseBuffer(buffer, assetOpts);

		if (!createNewInstance) {
			const weakRef = new WeakRef(asset);
			this.loadedAssets.set(uuid, weakRef);
		}

		return asset;
	}
}
