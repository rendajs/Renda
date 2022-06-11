/**
 * An internally created project asset is a reference to a project asset that
 * was created by another project asset. For instance a glTF asset might contain
 * several meshes, materials, textures etc. There needs to be a way for any
 * asset to reference these by an uuid. And when creating asset bundles we want
 * these glTF components to act as if they are regular assets, so they'll need
 * an uuid as well.
 * But we don't want to create a new ProjectAsset for every component, since not
 * all of them might be needed by the user. So this class is a wrapper that may
 * or may not contain a ProjectAsset. Only once the ProjectAsset is requested
 * via something like `AssetManager.getProjectAssetForLiveAsset()` will it be
 * created.
 */
export class InternallyCreatedAsset {
	/**
	 * @param {import("./AssetManager.js").AssetManager} assetManager
	 * @param {unknown} persistenceData
	 * @param {Object} options
	 * @param {import("../../../src/mod.js").UuidString?} options.forcedAssetUuid
	 */
	constructor(assetManager, persistenceData, {
		forcedAssetUuid,
	}) {
		this.assetManager = assetManager;
		this.persistenceData = persistenceData;
		this.forcedAssetUuid = forcedAssetUuid;

		this.createdProjectAsset = null;
	}

	getProjectAsset() {
		if (this.createdProjectAsset) return this.createdProjectAsset;
		/** @type {Partial<import("./ProjectAsset.js").ProjectAssetOptions>} */
		const projectAssetOptions = {};
		if (this.forcedAssetUuid) {
			projectAssetOptions.uuid = this.forcedAssetUuid;
		}
		this.createdProjectAsset = this.assetManager.createInternalProjectAsset(this, projectAssetOptions);
		return this.createdProjectAsset;
	}

	get needsPersistentUuid() {
		if (!this.createdProjectAsset) return false;
		return this.createdProjectAsset.needsConsistentUuid;
	}
}
