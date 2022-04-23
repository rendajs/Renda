import {SingleInstancePromise} from "../../../src/mod.js";
import {handleDuplicateFileName} from "../util/util.js";
import {generateUuid} from "../../../src/util/mod.js";
import {DefaultAssetLink} from "./DefaultAssetLink.js";
import {ProjectAsset} from "./ProjectAsset.js";

/**
 * @typedef {Object} SetDefaultBuiltInAssetLinkData
 * @property {import("../../../src/mod.js").UuidString} defaultAssetUuid
 * @property {import("../../../src/mod.js").UuidString?} originalAssetUuid
 */
/**
 * @typedef {Object} SetDefaultAssetLinkData
 * @property {string} name
 * @property {import("../../../src/mod.js").UuidString?} defaultAssetUuid
 * @property {import("../../../src/mod.js").UuidString?} originalAssetUuid
 */

/**
 * @template {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} [T = import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeUnknown]
 * @typedef AssetAssertionOptions
 * @property {(new (...args: any[]) => T)?} [assertAssetType]
 */

/**
 * @template {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} [T = import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeUnknown]
 * @typedef RequiredAssetAssertionOptions
 * @property {(new (...args: any[]) => T)} assertAssetType
 */

/**
 * @typedef GetLiveAssetFromUuidOrEmbeddedAssetDataExtraOptions
 * @property {import("./ProjectAsset.js").ProjectAssetAny} parentAsset The project asset that the embedded asset is stored in.
 * @property {unknown} embeddedAssetPersistenceKey A key that is used to keep persistence of embedded assets
 * when the parent asset was saved and reloaded. Normally saving and reloading would cause a new embedded asset to be
 * created, but if a key is set it will use a previously created embedded asset. The key can either be a string
 * or an object, but the object will be stringified using `JSON.stringify`.
 * You'll generally want to set a key that refers to the location of the embedded asset in the parent asset.
 * So for instance, if you have a parent asset that is a material map, and the embedded asset exists at
 * `materialMap.mapTypes[0].mapData.pipelineConfg`, you'll want to set the object to something like
 * `["mapTypes", 0, "mapData", "pipelineConfg"]`.
 * Note that if this is set, and an existing live asset is found, the embedded asset data on disk won't be loaded.
 */

/**
 * @template {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} [TProjectAssetType = import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeUnknown]
 * @typedef {RequiredAssetAssertionOptions<TProjectAssetType> & GetLiveAssetFromUuidOrEmbeddedAssetDataExtraOptions} GetLiveAssetFromUuidOrEmbeddedAssetDataOptions
 */

/**
 * @template {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} T
 * @typedef {T extends import("./projectAssetType/ProjectAssetType.js").ProjectAssetType<infer TLiveAsset, any, any, any> ? TLiveAsset : unknown} InferLiveAssetFromAssetType
 */

export class AssetManager {
	/**
	 * @param {import("../projectSelector/ProjectManager.js").ProjectManager} projectManager
	 * @param {import("./BuiltInAssetManager.js").BuiltInAssetManager} builtInAssetManager
	 * @param {import("./BuiltInDefaultAssetLinksManager.js").BuiltInDefaultAssetLinksManager} builtInDefaultAssetLinksManager
	 * @param {import("./ProjectAssetTypeManager.js").ProjectAssetTypeManager} projectAssetTypeManager
	 * @param {import("../util/fileSystems/EditorFileSystem.js").EditorFileSystem} fileSystem
	 */
	constructor(projectManager, builtInAssetManager, builtInDefaultAssetLinksManager, projectAssetTypeManager, fileSystem) {
		this.projectManager = projectManager;
		this.builtInAssetManager = builtInAssetManager;
		this.builtInDefaultAssetLinksManager = builtInDefaultAssetLinksManager;
		this.projectAssetTypeManager = projectAssetTypeManager;
		this.fileSystem = fileSystem;

		/** @type {Map<import("../../../src/mod.js").UuidString, import("./ProjectAsset.js").ProjectAssetAny>}*/
		this.projectAssets = new Map();
		/** @type {WeakMap<object, import("./ProjectAsset.js").ProjectAssetAny>} */
		this.embeddedAssets = new WeakMap();
		/** @type {Map<import("../../../src/mod.js").UuidString, DefaultAssetLink>}*/
		this.defaultAssetLinks = new Map();

		this.assetSettingsPath = ["ProjectSettings", "assetSettings.json"];

		this.assetSettingsLoaded = false;
		this.waitForAssetSettingsLoadCbs = new Set();

		this.boundExternalChange = this.externalChange.bind(this);
		this.fileSystem.onExternalChange(this.boundExternalChange);

		this.loadAssetSettingsFromUserGesture = false;
		this.loadAssetSettingsInstance = new SingleInstancePromise(async () => {
			await this.loadAssetSettingsInstanceFn();
		}, {
			once: false,
			run: true,
		});
	}

	destructor() {
		this.fileSystem.removeOnExternalChange(this.boundExternalChange);
	}

	get builtInAssets() {
		return this.builtInAssetManager.assets;
	}

	async loadAssetSettings(fromUserGesture = false) {
		this.loadAssetSettingsFromUserGesture = fromUserGesture;
		await this.loadAssetSettingsInstance.run();
	}

	async loadAssetSettingsInstanceFn() {
		if (this.assetSettingsLoaded) return;

		if (!this.loadAssetSettingsFromUserGesture) {
			const hasPermissions = await this.fileSystem.getPermission(this.assetSettingsPath);
			if (!hasPermissions) return;
		}

		for (const builtInAssetLink of this.builtInDefaultAssetLinksManager.registeredAssetLinks) {
			const defaultAssetLink = new DefaultAssetLink(builtInAssetLink);
			defaultAssetLink.setBuiltIn(true);
			this.defaultAssetLinks.set(builtInAssetLink.defaultAssetUuid, defaultAssetLink);
		}

		if (await this.fileSystem.isFile(this.assetSettingsPath)) {
			/** @type {import("./AssetSettingsDiskTypes.js").AssetSettingsDiskData?} */
			const json = await this.fileSystem.readJson(this.assetSettingsPath);
			if (json) {
				if (json.assets) {
					for (const [uuid, assetData] of Object.entries(json.assets)) {
						const projectAsset = await ProjectAsset.guessAssetTypeAndCreate(this, this.projectAssetTypeManager, this.builtInAssetManager, this.fileSystem, {uuid, ...assetData});
						if (projectAsset) {
							projectAsset.makeUuidConsistent();
							this.projectAssets.set(uuid, projectAsset);
						}
					}
				}

				if (json.defaultAssetLinks) {
					for (const [defaultAssetUuid, defaultAssetData] of Object.entries(json.defaultAssetLinks)) {
						const existingDefaultAssetLink = this.getDefaultAssetLink(defaultAssetUuid);
						if (existingDefaultAssetLink) {
							existingDefaultAssetLink.setUserData(defaultAssetData);
						} else {
							const defaultAssetLink = new DefaultAssetLink(defaultAssetData);
							this.defaultAssetLinks.set(defaultAssetUuid, defaultAssetLink);
						}
					}
				}
			}
		}
		for (const cb of this.waitForAssetSettingsLoadCbs) {
			cb();
		}
		this.assetSettingsLoaded = true;
	}

	async waitForAssetSettingsLoad() {
		if (this.assetSettingsLoaded) return;
		await new Promise(r => this.waitForAssetSettingsLoadCbs.add(r));
	}

	async saveAssetSettings() {
		/** @type {import("./AssetSettingsDiskTypes.js").AssetSettingsDiskData?} */
		const assetSettings = {};

		let hasAssets = false;
		/** @type {import("./AssetSettingsDiskTypes.js").AssetSettingsDiskData["assets"]} */
		const assets = {};
		for (const [uuid, projectAsset] of this.projectAssets) {
			if (projectAsset.needsAssetSettingsSave) {
				assets[uuid] = projectAsset.toJson();
				hasAssets = true;
			}
		}
		if (hasAssets) {
			assetSettings.assets = assets;
		}

		assetSettings.defaultAssetLinks = {};
		let savedDefaultAssetLinksCount = 0;
		for (const [defaultAssetUuid, assetLink] of this.defaultAssetLinks) {
			const jsonData = assetLink.toJson();
			if (jsonData) {
				assetSettings.defaultAssetLinks[defaultAssetUuid] = jsonData;
				savedDefaultAssetLinksCount++;
			}
		}
		if (savedDefaultAssetLinksCount == 0) {
			delete assetSettings.defaultAssetLinks;
		}
		await this.fileSystem.writeJson(this.assetSettingsPath, assetSettings);
	}

	/**
	 * @param {string[]} parentPath
	 * @param {string} assetType
	 */
	async createNewAsset(parentPath, assetType) {
		const type = this.projectAssetTypeManager.getAssetType(assetType);
		if (!type) return;

		let fileName = type.newFileName + "." + type.newFileExtension;

		if (await this.fileSystem.exists([...parentPath, fileName])) {
			const existingFiles = await this.fileSystem.readDir(parentPath);
			fileName = handleDuplicateFileName(existingFiles, type.newFileName, "." + type.newFileExtension);
		}
		const newPath = [...parentPath, fileName];

		const projectAsset = await this.registerAsset(newPath, assetType);
		await projectAsset.createNewLiveAssetData();
	}

	/**
	 * @param {string[]} path
	 */
	async deleteAsset(path) {
		await this.fileSystem.delete(path, true);
	}

	/**
	 * @private
	 * @param {Partial<import("./ProjectAsset.js").ProjectAssetOptions>} options
	 */
	projectAssetFactory(options) {
		const uuid = generateUuid();
		const newOptions = {
			uuid,
			...options,
		};
		return new ProjectAsset(this, this.projectAssetTypeManager, this.builtInAssetManager, this.fileSystem, newOptions);
	}

	/**
	 * @param {string[]} path
	 * @param {string?} assetType
	 * @param {boolean} forceAssetType
	 */
	async registerAsset(path, assetType = null, forceAssetType = false) {
		await this.loadAssetSettings(true);
		const projectAsset = this.projectAssetFactory({path, assetType, forceAssetType});
		await projectAsset.waitForInit();
		this.projectAssets.set(projectAsset.uuid, projectAsset);
		if (projectAsset.needsAssetSettingsSave) {
			this.saveAssetSettings();
		}
		return projectAsset;
	}

	/**
	 * @param {import("./ProjectAsset.js").ProjectAssetAny?} asset
	 */
	async makeAssetUuidConsistent(asset) {
		if (!asset || asset.needsConsistentUuid || asset.isBuiltIn) return;
		asset.makeUuidConsistent();
		await this.saveAssetSettings();
	}

	/**
	 * @param {import("../util/fileSystems/EditorFileSystem.js").FileSystemExternalChangeEvent} e
	 */
	async externalChange(e) {
		const projectAsset = await this.getProjectAssetFromPath(e.path, this.assetSettingsLoaded);
		if (projectAsset) {
			const guessedType = await ProjectAsset.guessAssetTypeFromFile(this.builtInAssetManager, this.projectAssetTypeManager, this.fileSystem, e.path);
			if (guessedType != projectAsset.assetType) {
				// todo
				console.warn("not yet implemented: changing assetType");
			} else {
				await projectAsset.fileChangedExternally();
			}
		}
	}

	/**
	 * @param {SetDefaultBuiltInAssetLinkData[]} builtInDefaultAssetLinks
	 * @param {SetDefaultAssetLinkData[]} defaultAssetLinks
	 */
	setDefaultAssetLinks(builtInDefaultAssetLinks, defaultAssetLinks) {
		const unsetAssetLinkUuids = new Set(this.defaultAssetLinks.keys());
		for (const {defaultAssetUuid, originalAssetUuid} of builtInDefaultAssetLinks) {
			const existingDefaultAssetLink = this.getDefaultAssetLink(defaultAssetUuid);
			if (existingDefaultAssetLink) {
				existingDefaultAssetLink.setUserData({name: "", originalAssetUuid});
			} else {
				this.defaultAssetLinks.set(defaultAssetUuid, new DefaultAssetLink({originalAssetUuid}));
			}
		}
		const userDefaultAssetLinkUuids = [];
		for (const {defaultAssetUuid: uuid, name, originalAssetUuid} of defaultAssetLinks) {
			let defaultAssetUuid = uuid;
			if (!defaultAssetUuid) defaultAssetUuid = generateUuid();
			userDefaultAssetLinkUuids.push(defaultAssetUuid);
			unsetAssetLinkUuids.delete(defaultAssetUuid);
			const existingDefaultAssetLink = this.getDefaultAssetLink(defaultAssetUuid);
			const userData = {name, defaultAssetUuid, originalAssetUuid};
			if (existingDefaultAssetLink) {
				existingDefaultAssetLink.setUserData(userData);
			} else {
				this.defaultAssetLinks.set(defaultAssetUuid, new DefaultAssetLink(userData));
			}
		}
		for (const unsetUuid of unsetAssetLinkUuids) {
			const defaultAssetLink = this.getDefaultAssetLink(unsetUuid);
			if (defaultAssetLink && !defaultAssetLink.isBuiltIn) {
				this.defaultAssetLinks.delete(unsetUuid);
			}
		}
		this.saveAssetSettings();
		return userDefaultAssetLinkUuids;
	}

	/**
	 * @param {import("../../../src/util/mod.js").UuidString} defaultAssetUuid
	 * @returns {DefaultAssetLink?}
	 */
	getDefaultAssetLink(defaultAssetUuid) {
		return this.defaultAssetLinks.get(defaultAssetUuid) ?? null;
	}

	/**
	 * @param {import("../../../src/util/mod.js").UuidString} uuid
	 * @returns {import("../../../src/util/mod.js").UuidString}
	 */
	resolveDefaultAssetLinkUuid(uuid) {
		const defaultAssetLink = this.getDefaultAssetLink(uuid);
		if (defaultAssetLink && defaultAssetLink.originalAssetUuid) {
			return this.resolveDefaultAssetLinkUuid(defaultAssetLink.originalAssetUuid);
		}
		return uuid;
	}

	/**
	 * @param {string[]} path
	 */
	async getAssetUuidFromPath(path) {
		const projectAsset = await this.getProjectAssetFromPath(path);
		if (!projectAsset) return null;
		return projectAsset.uuid;
	}

	/**
	 * Check if the provided project asset type is of a specific type and throws an error if it isn't.
	 * @private
	 * @param {typeof import("./projectAssetType/ProjectAssetType.js").ProjectAssetType?} projectAssetTypeConstructor
	 * @param {new (...args: any[]) => import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} expectedType
	 */
	assertProjectAssetIsType(projectAssetTypeConstructor, expectedType) {
		const castAssertAssetType = /** @type {typeof import("./projectAssetType/ProjectAssetType.js").ProjectAssetType} */ (expectedType);
		if (projectAssetTypeConstructor != castAssertAssetType) {
			const expected = castAssertAssetType.type;

			const actual = projectAssetTypeConstructor?.type || "none";
			throw new Error(`Unexpected asset type while getting project asset. Expected "${expected}" but got "${actual}".`);
		}
	}

	/**
	 * @template {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} [T = import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeUnknown]
	 * @param {import("../../../src/mod.js").UuidString | null} uuid
	 * @param {AssetAssertionOptions<T>} [options]
	 * @returns {Promise<import("./ProjectAsset.js").ProjectAsset<T>?>}
	 */
	async getProjectAssetFromUuid(uuid, {
		assertAssetType = null,
	} = {}) {
		await this.loadAssetSettings(true);
		const projectAsset = this.getProjectAssetFromUuidSync(uuid);
		if (!projectAsset) return null;
		if (assertAssetType) {
			const projectAssetTypeConstructor = await projectAsset.getProjectAssetTypeConstructor();

			this.assertProjectAssetIsType(projectAssetTypeConstructor, assertAssetType);
		}
		return projectAsset;
	}

	/**
	 * Same as {@linkcode getProjectAssetFromUuid} but synchronous.
	 * Make sure the asset settings have been loaded before calling this otherwise
	 * this might return null. Asset type assertion only works if the asset type
	 * has been determined in advance.
	 *
	 * @template {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} [T = import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeUnknown]
	 * @param {import("../../../src/mod.js").UuidString | null | undefined} uuid
	 * @param {AssetAssertionOptions<T>} [options]
	 */
	getProjectAssetFromUuidSync(uuid, {
		assertAssetType = null,
	} = {}) {
		if (!this.assetSettingsLoaded) return null;
		if (!uuid) return null;

		uuid = this.resolveDefaultAssetLinkUuid(uuid);
		const projectAsset = this.projectAssets.get(uuid) ?? this.builtInAssets.get(uuid);
		if (!projectAsset) return null;
		if (assertAssetType) {
			this.assertProjectAssetIsType(projectAsset.projectAssetTypeConstructorSync, assertAssetType);
		}
		return projectAsset;
	}

	/**
	 * @param {import("../../../src/mod.js").UuidString} uuid
	 */
	async getAssetPathFromUuid(uuid) {
		await this.loadAssetSettings(true);
		const asset = this.projectAssets.get(uuid);
		if (!asset) {
			if (this.builtInAssets.has(uuid)) {
				throw new Error("Getting asset path from built-in assets is not supported.");
			}
			return null;
		}
		return asset.path.slice();
	}

	/**
	 * @param {string[]} path1
	 * @param {string[]} path2
	 */
	static testPathMatch(path1, path2) {
		if (!path1 || !path2) return false;
		if (path1.length != path2.length) return false;
		for (let i = 0; i < path1.length; i++) {
			if (path1[i] != path2[i]) return false;
		}
		return true;
	}

	/**
	 * @param {string[]} path
	 * @param {boolean} registerIfNecessary
	 */
	async getProjectAssetFromPath(path, registerIfNecessary = true) {
		await this.loadAssetSettings(true);
		for (const asset of this.projectAssets.values()) {
			if (AssetManager.testPathMatch(path, asset.path)) {
				return asset;
			}
		}

		if (registerIfNecessary && await this.fileSystem.isFile(path)) {
			return await this.registerAsset(path);
		}
		return null;
	}

	/**
	 * @param {string[]} fromPath
	 * @param {string[]} toPath
	 */
	async assetMoved(fromPath = [], toPath = []) {
		const asset = await this.getProjectAssetFromPath(fromPath);
		if (!asset) return;
		asset.assetMoved(toPath);
		await this.saveAssetSettings();
	}

	/**
	 * @param {string[]} path
	 */
	async getAssetSettings(path = []) {
		await this.loadAssetSettings(true);
	}

	/**
	 * @param {string[]} path
	 * @param {*} settings
	 */
	setAssetSettings(path = [], settings = {}) {

	}

	/**
	 * @template {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} [T = import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeUnknown]
	 * @param {import("../../../src/mod.js").UuidString?} uuid
	 * @param {AssetAssertionOptions<T>} [assertionOptions]
	 */
	async getLiveAsset(uuid, assertionOptions) {
		const projectAsset = await this.getProjectAssetFromUuid(uuid, assertionOptions);
		if (!projectAsset) return null;

		const liveAsset = await projectAsset.getLiveAsset();
		return /** @type {InferLiveAssetFromAssetType<T>} */ (liveAsset);
	}

	/**
	 * @param {object?} liveAsset
	 */
	getProjectAssetForLiveAsset(liveAsset) {
		// this method doesn't need a loadAssetSettings call because there
		// is no way to get liveAssets without loading the settings anyway.
		// So we can keep this method sync.
		if (!liveAsset) return null;
		for (const projectAsset of this.projectAssets.values()) {
			if (projectAsset.liveAsset == liveAsset) return projectAsset;
		}
		for (const projectAsset of this.builtInAssets.values()) {
			if (projectAsset.liveAsset == liveAsset) return projectAsset;
		}
		const embeddedAsset = this.embeddedAssets.get(liveAsset);
		if (embeddedAsset) return embeddedAsset;
		return null;
	}

	/**
	 * @param {object?} liveAsset
	 */
	getAssetUuidFromLiveAsset(liveAsset) {
		const projectAsset = this.getProjectAssetForLiveAsset(liveAsset);
		if (projectAsset) {
			if (projectAsset.isEmbedded) {
				throw new Error("The provided live asset is from an embedded asset, embedded assets do not have UUIDs. Use getAssetUuidOrEmbeddedAssetDataFromLiveAsset() instead.");
			}
			return projectAsset.uuid;
		}
		return null;
	}

	/**
	 * @private
	 * @param {unknown} key
	 */
	embeddedPersistenceKeyToString(key) {
		if (!key) {
			throw new Error(`"${key}" is not a valid embedded asset key.`);
		}
		return JSON.stringify(key);
	}

	/**
	 * Creates a new embedded ProjectAsset. Embedded assets are not stored on
	 * disk in a single file, but rather, are embedded in another project asset.
	 * Embedded assets can't be accessed by a uuid or path. Instead you can use
	 * their liveAsset and {@linkcode getProjectAssetForLiveAsset} to get the
	 * ProjectAsset instance.
	 * Created embedded assets won't need to be destroyed, since they are only
	 * accessible through their liveAsset. Embedded ProjectAsset instances are
	 * garbage collected when their liveAsset is garbage collected.
	 *
	 * @param {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeIdentifier | typeof import("./projectAssetType/ProjectAssetType.js").ProjectAssetType} assetType
	 * @param {import("./ProjectAsset.js").ProjectAssetAny} parent
	 * @param {unknown} persistenceKey
	 */
	createEmbeddedAsset(assetType, parent, persistenceKey) {
		if (typeof assetType != "string") {
			assetType = assetType.type;
		}
		const projectAsset = this.projectAssetFactory({
			assetType,
			forceAssetType: true,
			embeddedParent: parent,
			embeddedParentPersistenceKey: this.embeddedPersistenceKeyToString(persistenceKey),
		});
		projectAsset.onLiveAssetDataChange(liveAssetData => {
			if (liveAssetData.liveAsset) {
				this.embeddedAssets.set(liveAssetData.liveAsset, projectAsset);
			}
		});
		return projectAsset;
	}

	/**
	 * Used for storing project asset data on disk. If the provided liveAsset
	 * is an embedded asset, it's json data will be returned that needs to be
	 * stored in the parent project asset.
	 * If the provided liveAsset is not an embedded asset, the uuid of the
	 * asset is returned, which can also be stored in the parent project asset.
	 *
	 * @param {object?} liveAsset
	 * @returns {import("../../../src/mod.js").UuidString | object | null}
	 */
	getAssetUuidOrEmbeddedAssetDataFromLiveAsset(liveAsset) {
		const projectAsset = this.getProjectAssetForLiveAsset(liveAsset);
		if (!projectAsset) return null;
		if (projectAsset.isEmbedded) {
			const data = projectAsset.readEmbeddedAssetData();
			return /** @type {object} */ (data);
		} else {
			return projectAsset.uuid;
		}
	}

	/**
	 * @private
	 * @param {import("../../../src/mod.js").UuidString | object | null | undefined} uuidOrData
	 * @param {new (...args: any[]) => import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} assertAssetType
	 * @param {import("./ProjectAsset.js").ProjectAssetAny} parentAsset
	 * @param {unknown} embeddedAssetPersistenceKey
	 */
	getEmbeddedProjectAssetOrCreate(uuidOrData, assertAssetType, parentAsset, embeddedAssetPersistenceKey) {
		const castAssertAssetType = /** @type {typeof import("./projectAssetType/ProjectAssetType.js").ProjectAssetType} */ (assertAssetType);

		const embeddedAssetPersistenceKeyString = this.embeddedPersistenceKeyToString(embeddedAssetPersistenceKey);

		const previousLiveAsset = parentAsset.getPreviousEmbeddedLiveAsset(embeddedAssetPersistenceKeyString);
		if (previousLiveAsset) {
			return this.getProjectAssetForLiveAsset(previousLiveAsset);
		}
		const projectAsset = this.createEmbeddedAsset(castAssertAssetType.type, parentAsset, embeddedAssetPersistenceKey);
		projectAsset.writeEmbeddedAssetDataSync(uuidOrData);
		return projectAsset;
	}

	/**
	 * Used for loading disk data into a ProjectAsset. If a uuid is provided, the
	 * corresponding project asset is returned. If an object is provided, a new
	 * embedded asset is created using the provided object as data.
	 * For more info about embedded asset creation see {@linkcode createEmbeddedAsset}.
	 * The assertionOptions is used both for creating new assets using the correct
	 * type, as well as asserting if existing assets have the correct type when
	 * a uuid is provided, similar to how it's used in {@linkcode getProjectAssetFromUuid}.
	 *
	 * @template {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} [T = import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeUnknown]
	 * @param {import("../../../src/mod.js").UuidString | object | null | undefined} uuidOrData
	 * @param {GetLiveAssetFromUuidOrEmbeddedAssetDataOptions<T>} options
	 */
	async getProjectAssetFromUuidOrEmbeddedAssetData(uuidOrData, {assertAssetType, parentAsset, embeddedAssetPersistenceKey}) {
		if (!uuidOrData) return null;
		let projectAsset;
		if (typeof uuidOrData == "string") {
			projectAsset = await this.getProjectAssetFromUuid(uuidOrData, {assertAssetType});
		} else {
			projectAsset = this.getEmbeddedProjectAssetOrCreate(uuidOrData, assertAssetType, parentAsset, embeddedAssetPersistenceKey);
		}
		return /** @type {ProjectAsset<T>} */ (projectAsset);
	}

	/**
	 * Same as {@linkcode getProjectAssetFromUuidOrEmbeddedAssetData}, but synchronous.
	 * Make sure the asset settings have been loaded before calling this.
	 *
	 * @template {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} [T = import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeUnknown]
	 * @param {import("../../../src/mod.js").UuidString | object | null | undefined} uuidOrData
	 * @param {GetLiveAssetFromUuidOrEmbeddedAssetDataOptions<T>} options
	 */
	getProjectAssetFromUuidOrEmbeddedAssetDataSync(uuidOrData, {assertAssetType, parentAsset, embeddedAssetPersistenceKey}) {
		if (!uuidOrData) return null;
		let projectAsset;
		if (typeof uuidOrData == "string") {
			projectAsset = this.getProjectAssetFromUuidSync(uuidOrData, {assertAssetType});
		} else {
			projectAsset = this.getEmbeddedProjectAssetOrCreate(uuidOrData, assertAssetType, parentAsset, embeddedAssetPersistenceKey);
		}
		return /** @type {ProjectAsset<T>} */ (projectAsset);
	}

	/**
	 * Used for loading disk data into a liveAsset. If a uuid is provided, the
	 * live asset from the corresponding project asset is returned. If an object
	 * is provided, a new embedded asset is created using the provided object as data.
	 * For more info about embedded asset creation see {@linkcode createEmbeddedAsset}.
	 * The assertionOptions is used both for creating new assets using the correct
	 * type, as well as asserting if existing assets have the correct type when
	 * a uuid is provided, similar to how it's used in {@linkcode getLiveAsset}.
	 *
	 * @template {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} [T = import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeUnknown]
	 * @param {import("../../../src/mod.js").UuidString | object | null | undefined} uuidOrData
	 * @param {GetLiveAssetFromUuidOrEmbeddedAssetDataOptions<T>} options
	 * @returns {Promise<InferLiveAssetFromAssetType<T>?>}
	 */
	async getLiveAssetFromUuidOrEmbeddedAssetData(uuidOrData, options) {
		const projectAsset = await this.getProjectAssetFromUuidOrEmbeddedAssetData(uuidOrData, options);
		if (!projectAsset) return null;
		return await projectAsset.getLiveAsset();
	}
}
