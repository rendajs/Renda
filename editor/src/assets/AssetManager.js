import {SingleInstancePromise} from "../../../src/mod.js";
import {handleDuplicateFileName} from "../util/util.js";
import {generateUuid} from "../../../src/util/mod.js";
import {DefaultAssetLink} from "./DefaultAssetLink.js";
import {ProjectAsset} from "./ProjectAsset.js";
import {InternallyCreatedAsset} from "./InternallyCreatedAsset.js";

/**
 * @typedef {object} SetDefaultBuiltInAssetLinkData
 * @property {import("../../../src/mod.js").UuidString} defaultAssetUuid
 * @property {import("../../../src/mod.js").UuidString?} originalAssetUuid
 */
/**
 * @typedef {object} SetDefaultAssetLinkData
 * @property {string} name
 * @property {import("../../../src/mod.js").UuidString?} defaultAssetUuid
 * @property {import("../../../src/mod.js").UuidString?} originalAssetUuid
 */

/**
 * @template {new (...args: any[]) => import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} [T = new (...args: any[]) => import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny]
 * @typedef AssetAssertionOptions
 * @property {T | T[] | null} [assertAssetType]
 */

/**
 * @template {new (...args: any[]) => import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} [T = new (...args: any[]) => import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny]
 * @typedef RequiredAssetAssertionOptions
 * @property {T | T[]} assertAssetType
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
 * @typedef {RequiredAssetAssertionOptions<new (...args: any[]) => import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny> & GetLiveAssetFromUuidOrEmbeddedAssetDataExtraOptions} GetLiveAssetFromUuidOrEmbeddedAssetDataOptions
 */

/**
 * @template {AssetAssertionOptions} T
 * @typedef {T["assertAssetType"] extends (new (...args: any[]) => infer ProjectAssetType) ?
 * 	ProjectAssetType :
 * T["assertAssetType"] extends (new (...args: any[]) => infer ProjectAssetType)[] ?
 * 	ProjectAssetType :
 * import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeUnknown} AssetAssertionOptionsToProjectAssetType
 */

/**
 * @template {AssetAssertionOptions} T
 * @typedef {import("./ProjectAsset.js").ProjectAsset<AssetAssertionOptionsToProjectAssetType<T>>} AssetAssertionOptionsToProjectAsset
 */

/**
 * @template {AssetAssertionOptions} T
 * @typedef {AssetAssertionOptionsToProjectAsset<T> extends infer ProjectAsset ?
 * 	ProjectAsset extends import("./ProjectAsset.js").ProjectAsset<infer ProjectAssetType> ?
 * 		ProjectAssetType extends import("./projectAssetType/ProjectAssetType.js").ProjectAssetType<infer TLiveAsset, any, any, any> ?
 * 			TLiveAsset :
 * 			never :
 * 		never :
 * 	never} AssetAssertionOptionsToLiveAsset
 */

/**
 * @template {AssetAssertionOptions} T
 * @typedef {AssetAssertionOptionsToProjectAsset<T> extends infer ProjectAsset ?
 * 	ProjectAsset extends import("./ProjectAsset.js").ProjectAsset<infer ProjectAssetType> ?
 * 		ProjectAssetType extends import("./projectAssetType/ProjectAssetType.js").ProjectAssetType<any, any, infer TFileData, any> ?
 * 			TFileData :
 * 			never :
 * 		never :
 * 	never} AssetAssertionOptionsToReadAssetDataReturn
 */

/** @typedef {(granted: boolean) => void} OnPermissionPromptResultCallback */

export class AssetManager {
	/** @type {Set<OnPermissionPromptResultCallback>} */
	#onPermissionPromptResultCbs = new Set();

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
		/**
		 * These are all the internally created assets that have been assigned a uuid.
		 * There are more internally created assets but they live in the `internallyCreatedAssets`
		 * property of individual project asset instances. The reason why this extra map
		 * exists is because we need to quickly be able to reference an asset by uuid, and when
		 * storing internally created asset data in the project assets we need to be able to iterate
		 * over all the assets. The internally created assets on the individual project assets are
		 * stored in a weakmap so we can't iterate over it.
		 * @type {Map<import("../../../src/mod.js").UuidString, InternallyCreatedAsset>}
		 */
		this.internallyCreatedAssets = new Map();
		/**
		 * Same as `internallyCreatedAssets` but with the stringified persistence data as key.
		 * This allows for easier access to the correct asset.
		 * @type {Map<string, InternallyCreatedAsset>}
		 */
		this.internallyCreatedAssetsByPersistenceKey = new Map();

		this.assetSettingsPath = ["ProjectSettings", "assetSettings.json"];

		this.assetSettingsLoaded = false;
		/** @type {Set<() => void>} */
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

		const hasPermissions = await this.fileSystem.getPermission(this.assetSettingsPath, {
			prompt: this.loadAssetSettingsFromUserGesture,
		});
		if (this.loadAssetSettingsFromUserGesture || hasPermissions) {
			this.#onPermissionPromptResultCbs.forEach(cb => cb(hasPermissions));
		}
		if (!hasPermissions) {
			return;
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
							projectAsset.makeUuidPersistent();
							this.projectAssets.set(uuid, projectAsset);
						}
					}
				}

				if (json.internallyCreatedAssets) {
					for (const {uuid, persistenceData} of json.internallyCreatedAssets) {
						const asset = this.getOrCreateInternallyCreatedAsset(persistenceData, {
							forcedAssetUuid: uuid,
						});
						this.storeInternallyCreatedAsset(uuid, asset);
						const projectAsset = asset.getProjectAsset();
						projectAsset.makeUuidPersistent();
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

	/**
	 * You'll likely want to use {@linkcode waitForAssetListsLoad} instead because
	 * this method doesn't wait for built-in assets to load.
	 * Returns a promise that resolves once an asset manager has been loaded.
	 */
	async waitForAssetSettingsLoad() {
		if (this.assetSettingsLoaded) return;
		/** @type {Promise<void>} */
		const promise = new Promise(r => this.waitForAssetSettingsLoadCbs.add(r));
		await promise;
	}

	/**
	 * This callback is called when the user dismissed the prompt asking for
	 * file system permissions that was triggered by a call to {@linkcode loadAssetSettings},
	 * This also fires when permission has been granted, either via the prompt or
	 * because permissions were already granted.
	 * @param {OnPermissionPromptResultCallback} cb
	 */
	onPermissionPromptResult(cb) {
		this.#onPermissionPromptResultCbs.add(cb);
	}

	/**
	 * @param {OnPermissionPromptResultCallback} cb
	 */
	removeOnPermissionPromptResult(cb) {
		this.#onPermissionPromptResultCbs.delete(cb);
	}

	/**
	 * Waits for both the list of project assets and the builtin assets to be loaded.
	 * This is useful when making calls like {@linkcode getProjectAssetFromUuidSync}
	 * since methods like these will return null when the asset lists are not yet loaded.
	 */
	async waitForAssetListsLoad() {
		await this.waitForAssetSettingsLoad();
		await this.builtInAssetManager.waitForLoad();
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
		/** @type {import("./AssetSettingsDiskTypes.js").InternallyCreatedAssetDiskData[]} */
		const internallyCreatedAssets = [];
		for (const [uuid, asset] of this.internallyCreatedAssets) {
			if (!asset.needsPersistentUuid) continue;
			internallyCreatedAssets.push({
				uuid,
				persistenceData: asset.persistenceData,
			});
		}
		if (internallyCreatedAssets.length > 0) {
			assetSettings.internallyCreatedAssets = internallyCreatedAssets;
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
	 * Creates a new asset at the specified directory.
	 * The name of the file is determined by the asset type and if an asset
	 * already exists a different name will be chosen for the new asset.
	 * If you wish to create an asset with a specific name, use {@linkcode registerAsset}.
	 * @param {string[]} parentPath
	 * @param {string} assetType
	 */
	async createNewAsset(parentPath, assetType) {
		const type = this.projectAssetTypeManager.getAssetType(assetType);
		if (!type) {
			throw new Error(`Failed to create asset with type "${assetType}" because no such type is registered.`);
		}

		let fileName = type.newFileName + "." + type.newFileExtension;

		if (await this.fileSystem.exists([...parentPath, fileName])) {
			const existingFiles = await this.fileSystem.readDir(parentPath);
			fileName = handleDuplicateFileName(existingFiles, type.newFileName, "." + type.newFileExtension);
		}
		const newPath = [...parentPath, fileName];

		const projectAsset = await this.registerAsset(newPath, assetType);
		await projectAsset.createNewLiveAssetData();
		return projectAsset;
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
		let newOptions;
		if (!options.uuid) {
			const uuid = generateUuid();
			newOptions = {
				uuid,
				...options,
			};
		} else {
			newOptions = /** @type {typeof options & {uuid: import("../../../src/mod.js").UuidString}} */ ({
				...options,
			});
		}
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
	 * If an internally created asset with the provided persistence data exists,
	 * its instance is returned. Otherwise, a new instance is created.
	 * This new instance won't be stored in the project asset registry though.
	 * So if you make the same call multiple times, a new instance is returned.
	 * If you wish for the instance to stay the same, make sure to call
	 * `InternallyCreatedAsset.getProjectAsset()` first. This is generally
	 * already called when the asset is being linked to from most places.
	 * @param {unknown} persistenceData
	 * @param {object} options
	 * @param {import("../../../src/mod.js").UuidString?} [options.forcedAssetUuid] When set,
	 * forces the a specific uuid once the ProjectAsset is created. If the internally
	 * created asset already exists, this option has no effect.
	 */
	getOrCreateInternallyCreatedAsset(persistenceData, {
		forcedAssetUuid = null,
	} = {}) {
		const persistenceKey = JSON.stringify(persistenceData);
		const asset = this.internallyCreatedAssetsByPersistenceKey.get(persistenceKey);
		if (asset) return asset;
		return new InternallyCreatedAsset(this, persistenceData, {forcedAssetUuid});
	}

	/**
	 * @param {InternallyCreatedAsset} internallyCreatedAsset
	 * @param {Partial<import("./ProjectAsset.js").ProjectAssetOptions>} options
	 */
	createInternalProjectAsset(internallyCreatedAsset, options) {
		const projectAsset = this.projectAssetFactory(options);
		this.storeInternallyCreatedAsset(projectAsset.uuid, internallyCreatedAsset);
		return projectAsset;
	}

	/**
	 * @private
	 * @param {import("../../../src/mod.js").UuidString} uuid
	 * @param {InternallyCreatedAsset} internallyCreatedAsset
	 */
	storeInternallyCreatedAsset(uuid, internallyCreatedAsset) {
		this.internallyCreatedAssets.set(uuid, internallyCreatedAsset);
		const persistenceKey = JSON.stringify(internallyCreatedAsset.persistenceData);
		this.internallyCreatedAssetsByPersistenceKey.set(persistenceKey, internallyCreatedAsset);
	}

	/**
	 * @param {import("./ProjectAsset.js").ProjectAssetAny?} asset
	 */
	async makeAssetUuidPersistent(asset) {
		if (!asset || asset.needsPersistentUuid || asset.isBuiltIn) return;
		asset.makeUuidPersistent();
		await this.saveAssetSettings();
	}

	/**
	 * @param {import("../util/fileSystems/EditorFileSystem.js").FileSystemExternalChangeEvent} e
	 */
	async externalChange(e) {
		const projectAsset = await this.getProjectAssetFromPath(e.path, {
			registerIfNecessary: this.assetSettingsLoaded,
		});
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
	 * @param {typeof import("./projectAssetType/ProjectAssetType.js").ProjectAssetType?} projectAssetTypeConstructor
	 * @param {(new (...args: any[]) => import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny) | (new (...args: any[]) => import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny)[]} expectedType
	 */
	static assertProjectAssetIsType(projectAssetTypeConstructor, expectedType) {
		let castExpectedTypes = /** @type {(typeof import("./projectAssetType/ProjectAssetType.js").ProjectAssetType) | (typeof import("./projectAssetType/ProjectAssetType.js").ProjectAssetType)[]} */ (expectedType);
		if (!Array.isArray(castExpectedTypes)) {
			castExpectedTypes = [castExpectedTypes];
		}
		if (castExpectedTypes.length == 0) {
			throw new Error("Failed to assert the asset type, an empty array was provided.");
		}
		let anyExpected = false;
		for (const castExpectedType of castExpectedTypes) {
			if (projectAssetTypeConstructor == castExpectedType) {
				anyExpected = true;
				break;
			}
		}

		if (!anyExpected) {
			const expectedTypes = castExpectedTypes.map(t => t.type);
			let expectedString = "";
			if (expectedTypes.length > 1) {
				const lastItem = expectedTypes.pop();
				const secondLastItem = expectedTypes.pop();
				expectedTypes.push(`${secondLastItem}" or "${lastItem}`);
				const quotedTypes = expectedTypes.map(t => `"${t}"`);
				expectedString = `one of ${quotedTypes.join(", ")}`;
			} else {
				expectedString = `"${expectedTypes[0]}"`;
			}
			const actual = projectAssetTypeConstructor?.type || "none";
			throw new Error(`Unexpected asset type while getting project asset. Expected ${expectedString} but got "${actual}".`);
		}
	}

	/**
	 * @template {AssetAssertionOptions} [T = {}]
	 * @param {import("../../../src/mod.js").UuidString | null | undefined} uuid
	 * @param {T} options
	 * @returns {Promise<AssetAssertionOptionsToProjectAsset<T>?>}
	 */
	async getProjectAssetFromUuid(uuid, {
		assertAssetType = null,
	} = /** @type {T} */ ({})) {
		await this.loadAssetSettings(true);
		const projectAsset = this.getProjectAssetFromUuidSync(uuid);
		if (!projectAsset) return null;
		if (assertAssetType) {
			const projectAssetTypeConstructor = await projectAsset.getProjectAssetTypeConstructor();
			AssetManager.assertProjectAssetIsType(projectAssetTypeConstructor, assertAssetType);
		}
		return /** @type {AssetAssertionOptionsToProjectAsset<T>} */ (projectAsset);
	}

	/**
	 * Same as {@linkcode getProjectAssetFromUuid} but synchronous.
	 * Make sure the asset settings have been loaded before calling this otherwise
	 * this might return null. To do this, wait for {@linkcode waitForAssetListsLoad} to resolve
	 * before calling this method.
	 * Asset type assertion only works if the asset type has been determined in advance.
	 *
	 * @template {AssetAssertionOptions} [T = {}]
	 * @param {import("../../../src/mod.js").UuidString | null | undefined} uuid
	 * @param {T} options
	 * @returns {AssetAssertionOptionsToProjectAsset<T>?}
	 */
	getProjectAssetFromUuidSync(uuid, {
		assertAssetType = null,
	} = /** @type {T} */ ({})) {
		if (!this.assetSettingsLoaded || !uuid) return null;

		uuid = this.resolveDefaultAssetLinkUuid(uuid);
		const projectAsset = this.projectAssets.get(uuid) ?? this.builtInAssets.get(uuid);
		if (!projectAsset) return null;
		if (assertAssetType) {
			AssetManager.assertProjectAssetIsType(projectAsset.projectAssetTypeConstructorSync, assertAssetType);
		}
		return /** @type {AssetAssertionOptionsToProjectAsset<T>} */ (projectAsset);
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
	 * @template {AssetAssertionOptions} [T = {}]
	 * @param {string[]} path
	 * @param {object} options
	 * @param {boolean} [options.registerIfNecessary]
	 * @param {T?} [options.assertionOptions]
	 */
	async getProjectAssetFromPath(path, {
		registerIfNecessary = true,
		assertionOptions = null,
	} = {}) {
		await this.loadAssetSettings(true);
		let projectAsset = null;
		for (const asset of this.projectAssets.values()) {
			if (AssetManager.testPathMatch(path, asset.path)) {
				projectAsset = asset;
				break;
			}
		}

		if (!projectAsset && registerIfNecessary && await this.fileSystem.isFile(path)) {
			projectAsset = await this.registerAsset(path);
		}
		if (projectAsset && assertionOptions?.assertAssetType) {
			const projectAssetTypeConstructor = await projectAsset.getProjectAssetTypeConstructor();
			AssetManager.assertProjectAssetIsType(projectAssetTypeConstructor, assertionOptions.assertAssetType);
		}
		return /** @type {AssetAssertionOptionsToProjectAsset<T>?} */ (projectAsset);
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
	 * @template {AssetAssertionOptions} [T = {}]
	 * @param {import("../../../src/mod.js").UuidString?} uuid
	 * @param {T} [assertionOptions]
	 * @returns {Promise<AssetAssertionOptionsToLiveAsset<T>?>}
	 */
	async getLiveAsset(uuid, assertionOptions) {
		const projectAsset = await this.getProjectAssetFromUuid(uuid, assertionOptions);
		if (!projectAsset) return null;

		const liveAsset = await projectAsset.getLiveAsset();
		return /** @type {AssetAssertionOptionsToLiveAsset<T>} */ (liveAsset);
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
			const internallyCreated = projectAsset.internallyCreatedAssets.get(liveAsset);
			if (internallyCreated) return internallyCreated.getProjectAsset();
		}
		for (const projectAsset of this.builtInAssets.values()) {
			if (projectAsset.liveAsset == liveAsset) return projectAsset;
			const internallyCreated = projectAsset.internallyCreatedAssets.get(liveAsset);
			if (internallyCreated) return internallyCreated.getProjectAsset();
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
	 * Recurses down all the references of an asset and yields the uuid of every reference.
	 * @param {import("../../../src/util/mod.js").UuidString[]} assetUuids The uuid to start searching from.
	 * @param {object} options
	 * @param {Set<import("../../../src/util/mod.js").UuidString>} [options.excludeUuids] Uuids to exclude from the results.
	 * @param {Set<import("../../../src/util/mod.js").UuidString>} [options.excludeUuidsRecursive] Uuids to exclude, where
	 * all its references are excluded as well. Use this to efficiently exclude
	 * assets with a large tree of references.
	 * @returns {AsyncGenerator<import("../../../src/util/mod.js").UuidString>}
	 */
	async *collectAllAssetReferences(assetUuids, {
		excludeUuids = new Set(),
		excludeUuidsRecursive = new Set(),
	} = {}) {
		/** @type {Set<import("../../../src/util/mod.js").UuidString>} */
		const foundUuids = new Set();
		for (const assetUuid of assetUuids) {
			for await (const uuid of this.#collectAllAssetReferencesHelper(assetUuid, foundUuids, excludeUuids, excludeUuidsRecursive)) {
				foundUuids.add(uuid);
				yield uuid;
			}
		}
	}

	/**
	 * @param {import("../../../src/util/mod.js").UuidString} assetUuid
	 * @param {Set<import("../../../src/util/mod.js").UuidString>} foundUuids
	 * @param {Set<import("../../../src/util/mod.js").UuidString>} excludeUuids
	 * @param {Set<import("../../../src/util/mod.js").UuidString>} excludeUuidsRecursive
	 * @returns {AsyncGenerator<import("../../../src/util/mod.js").UuidString>}
	 */
	async *#collectAllAssetReferencesHelper(assetUuid, foundUuids, excludeUuids, excludeUuidsRecursive) {
		const projectAsset = await this.getProjectAssetFromUuid(assetUuid);
		if (projectAsset) {
			if (foundUuids.has(assetUuid) || excludeUuidsRecursive.has(assetUuid)) return;
			if (!excludeUuids.has(assetUuid)) yield assetUuid;
			for await (const referenceUuid of projectAsset.getReferencedAssetUuids()) {
				for await (const subReferenceUuid of this.#collectAllAssetReferencesHelper(referenceUuid, foundUuids, excludeUuids, excludeUuidsRecursive)) {
					yield this.resolveDefaultAssetLinkUuid(subReferenceUuid);
				}
			}
		}
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
	 * @param {(new (...args: any[]) => import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny) | (new (...args: any[]) => import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny)[]} assertAssetType
	 * @param {import("./ProjectAsset.js").ProjectAssetAny} parentAsset
	 * @param {unknown} embeddedAssetPersistenceKey
	 */
	getEmbeddedProjectAssetOrCreate(uuidOrData, assertAssetType, parentAsset, embeddedAssetPersistenceKey) {
		const embeddedAssetPersistenceKeyString = this.embeddedPersistenceKeyToString(embeddedAssetPersistenceKey);

		const previousLiveAsset = parentAsset.getPreviousEmbeddedLiveAsset(embeddedAssetPersistenceKeyString);
		if (previousLiveAsset) {
			return this.getProjectAssetForLiveAsset(previousLiveAsset);
		}

		let castAssertAssetTypeSingle = /** @type {(typeof import("./projectAssetType/ProjectAssetType.js").ProjectAssetType) | (typeof import("./projectAssetType/ProjectAssetType.js").ProjectAssetType)[]} */ (assertAssetType);
		if (Array.isArray(castAssertAssetTypeSingle)) {
			if (castAssertAssetTypeSingle.length == 0) {
				throw new Error("Failed to create embedded asset, `assertAssetType` is an empty array.");
			}
			castAssertAssetTypeSingle = castAssertAssetTypeSingle[0];
		}
		const projectAsset = this.createEmbeddedAsset(castAssertAssetTypeSingle.type, parentAsset, embeddedAssetPersistenceKey);
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
	 * @template {GetLiveAssetFromUuidOrEmbeddedAssetDataOptions} T
	 * @param {import("../../../src/mod.js").UuidString | object | null | undefined} uuidOrData
	 * @param {T} options
	 * @returns {Promise<AssetAssertionOptionsToProjectAsset<T>?>}
	 */
	async getProjectAssetFromUuidOrEmbeddedAssetData(uuidOrData, {assertAssetType, parentAsset, embeddedAssetPersistenceKey}) {
		if (!uuidOrData) return null;
		let projectAsset;
		if (typeof uuidOrData == "string") {
			projectAsset = await this.getProjectAssetFromUuid(uuidOrData, {assertAssetType});
		} else {
			projectAsset = this.getEmbeddedProjectAssetOrCreate(uuidOrData, assertAssetType, parentAsset, embeddedAssetPersistenceKey);
		}
		return /** @type {AssetAssertionOptionsToProjectAsset<T>} */ (projectAsset);
	}

	/**
	 * Same as {@linkcode getProjectAssetFromUuidOrEmbeddedAssetData}, but synchronous.
	 * Make sure the asset settings have been loaded before calling this.
	 *
	 * @template {GetLiveAssetFromUuidOrEmbeddedAssetDataOptions} T
	 * @param {import("../../../src/mod.js").UuidString | object | null | undefined} uuidOrData
	 * @param {T} options
	 * @returns {AssetAssertionOptionsToProjectAsset<T>?}
	 */
	getProjectAssetFromUuidOrEmbeddedAssetDataSync(uuidOrData, {assertAssetType, parentAsset, embeddedAssetPersistenceKey}) {
		if (!uuidOrData) return null;
		let projectAsset;
		if (typeof uuidOrData == "string") {
			projectAsset = this.getProjectAssetFromUuidSync(uuidOrData, {assertAssetType});
		} else {
			projectAsset = this.getEmbeddedProjectAssetOrCreate(uuidOrData, assertAssetType, parentAsset, embeddedAssetPersistenceKey);
		}
		return /** @type {AssetAssertionOptionsToProjectAsset<T>} */ (projectAsset);
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
	 * @template {GetLiveAssetFromUuidOrEmbeddedAssetDataOptions} T
	 * @param {import("../../../src/mod.js").UuidString | object | null | undefined} uuidOrData
	 * @param {T} options
	 * @returns {Promise<AssetAssertionOptionsToLiveAsset<T>?>}
	 */
	async getLiveAssetFromUuidOrEmbeddedAssetData(uuidOrData, options) {
		const projectAsset = await this.getProjectAssetFromUuidOrEmbeddedAssetData(uuidOrData, options);
		if (!projectAsset) return null;
		const liveAsset = await projectAsset.getLiveAsset();
		return /** @type {AssetAssertionOptionsToLiveAsset<T>} */ (liveAsset);
	}
}
