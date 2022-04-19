import {getEditorInstance} from "../editorInstance.js";
import {AssetLoaderTypeGenericStructure} from "../../../src/mod.js";
import {getNameAndExtension} from "../util/fileSystems/pathUtil.js";
import {PropertiesTreeView} from "../ui/propertiesTreeView/PropertiesTreeView.js";
import {StorageType, objectToBinary} from "../../../src/util/binarySerialization.js";
import {SingleInstancePromise} from "../../../src/util/SingleInstancePromise.js";
import {RecursionTracker} from "./liveAssetDataRecursionTracker/RecursionTracker.js";

/** @typedef {ProjectAsset<any>} ProjectAssetAny */

/**
 * @typedef {Object} RegisteredRecursionTrackerLiveAssetHandler
 * @property {() => void} registeredCallback
 * @property {WeakRef<ProjectAssetAny>} registeredOnAsset
 */

/**
 * @typedef {Object} ProjectAssetOptions
 * @property {import("../../../src/util/mod.js").UuidString} uuid
 * @property {string[]} [path]
 * @property {*} [assetSettings]
 * @property {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeIdentifier?} [assetType]
 * @property {boolean} [forceAssetType]
 * @property {boolean} [isBuiltIn]
 * @property {ProjectAssetAny?} [embeddedParent] When set, marks the created asset as embedded asset and assigns the
 * provided asset as parent.
 * @property {string} [embeddedParentPersistenceKey] This is used to keep this asset as embedded asset when
 * the parent is reloaded. This string is passed on to the parent when creating a new liveasset.
 */

/**
 * @typedef {Object} ProjectAssetJsonData
 * @property {string[]} path
 * @property {string} [assetType]
 * @property {Object} [assetSettings]
 */

/**
 * @typedef {(liveAssetData: LiveAssetData) => void} LiveAssetDataChangedCallback
 */

/**
 * A single project asset stores data such as the path, uuid, asset settings, etc.
 * Live asset creation/destruction is also managed from this class.
 * The specifics of handling different types of assets is implemented from
 * extended `ProjectAssetType` classes.
 * @template {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} T
 */
export class ProjectAsset {
	/** @typedef {T extends import("./projectAssetType/ProjectAssetType.js").ProjectAssetType<infer U, any, any, any> ? U :never} LiveAssetType */
	/** @typedef {T extends import("./projectAssetType/ProjectAssetType.js").ProjectAssetType<any, infer U, any, any> ? U :never} EditorDataType */
	/** @typedef {T extends import("./projectAssetType/ProjectAssetType.js").ProjectAssetType<any, any, infer U, any> ? U :never} FileDataType */
	/** @typedef {T extends import("./projectAssetType/ProjectAssetType.js").ProjectAssetType<any, any, any, infer U> ? U :never} AssetSettigsType */
	/** @typedef {import("./projectAssetType/ProjectAssetType.js").LiveAssetData<LiveAssetType, EditorDataType>} LiveAssetData */

	/**
	 * @param {import("./AssetManager.js").AssetManager} assetManager
	 * @param {import("./ProjectAssetTypeManager.js").ProjectAssetTypeManager} assetTypeManager
	 * @param {import("./BuiltInAssetManager.js").BuiltInAssetManager} builtInAssetManager
	 * @param {import("../util/fileSystems/EditorFileSystem.js").EditorFileSystem?} fileSystem
	 * @param {ProjectAssetOptions} options
	 */
	constructor(assetManager, assetTypeManager, builtInAssetManager, fileSystem, {
		uuid,
		path = [],
		assetSettings = {},
		assetType = null,
		forceAssetType = false,
		isBuiltIn = false,
		embeddedParent = null,
		embeddedParentPersistenceKey = "",
	}) {
		this.assetManager = assetManager;
		this.assetTypeManager = assetTypeManager;
		this.builtInAssetManager = builtInAssetManager;

		if (!fileSystem && !isBuiltIn) {
			throw new Error("fileSystem can only be null for builtIn assets");
		}
		/**
		 * This is null for builtIn assets.
		 * @type {import("../util/fileSystems/EditorFileSystem.js").EditorFileSystem?}
		 */
		this.fileSystem = fileSystem;

		/** @type {import("../../../src/util/mod.js").UuidString} */
		this.uuid = uuid;
		/** @type {Array<string>}*/
		this.path = path;
		/** @type {AssetSettigsType} */
		this.assetSettings = assetSettings;
		/** @type {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeIdentifier | null} */
		this.assetType = assetType;
		this.forceAssetType = forceAssetType;
		this.needsConsistentUuid = false;
		this.isBuiltIn = isBuiltIn;
		this.isEmbedded = !!embeddedParent;

		/** @type {T?} */
		this._projectAssetType = null;
		this.isGettingLiveAssetData = false;
		this.currentGettingLiveAssetSymbol = null;
		/** @type {Set<LiveAssetDataChangedCallback>} */
		this.onLiveAssetDataChangeCbs = new Set();
		/** @type {Set<LiveAssetDataChangedCallback>} */
		this.onLiveAssetDataChangePromiseCbs = new Set();
		/** @type {LiveAssetType?} */
		this.liveAsset = null;
		/** @type {EditorDataType?} */
		this.editorData = null;
		/** @private @type {FileDataType} */
		this.currentEmbeddedAssetData = /** @type {FileDataType} */ ({});
		/** @private @type {ProjectAssetAny?} */
		this.embeddedParentAsset = embeddedParent;
		this.embeddedParentPersistenceKey = embeddedParentPersistenceKey;
		/** @private @type {Map<string, WeakRef<Object>>} */
		this.previousLiveAssets = new Map();

		this.initInstance = new SingleInstancePromise(async () => await this.init());
		this.initInstance.run();

		/** @type {Set<() => void>} */
		this.onLiveAssetNeedsReplacementCbs = new Set();

		/**
		 * Whenever {@linkcode RecursionTracker.getLiveAssetData} is called with
		 * `repeatOnLiveAssetChange`, a handler is registered with {@linkcode onLiveAssetNeedsReplacement}.
		 * To ensure all handlers are removed again when the live asset
		 * is unloaded or the ProjectAsset is destructed, we keep track of an
		 * extra list of registered handlers.
		 *
		 * So there's two lists:
		 * - {@linkcode onLiveAssetNeedsReplacementCbs} - The actual handlers, stored
		 * on ProjectAsset A, fired when ProjectAsset A changes.
		 * - {@linkcode registeredLiveAssetChangeHandlers} - The registered handlers.
		 * Stored on ProjectAsset B, never actually fired
		 * by logic on ProjectAsset B, only used for unregistering.
		 * @type {Set<RegisteredRecursionTrackerLiveAssetHandler>}
		 */
		this.registeredLiveAssetChangeHandlers = new Set();
		this.currentRecursionTrackerLiveAssetChangeSym = null;

		this.destructed = false;
	}

	destructor() {
		this.destructed = true;

		this.destroyLiveAssetData();
		this._projectAssetType = null;
		this.onLiveAssetNeedsReplacementCbs.clear();
		this.clearRecursionTrackerLiveAssetChangeHandlers();
	}

	async init() {
		if (!this.assetType) {
			try {
				this.assetType = await ProjectAsset.guessAssetTypeFromFile(this.builtInAssetManager, this.assetTypeManager, this.fileSystem, this.path, this.isBuiltIn);
			} catch (e) {
				this.assetType = null;
			}
		}
		if (this.destructed) return;

		if (this.assetType) {
			const AssetTypeConstructor = this.assetTypeManager.getAssetType(this.assetType);
			if (AssetTypeConstructor) {
				const projectAssetType = new AssetTypeConstructor(getEditorInstance(), this, this.assetManager, this.assetTypeManager);
				/* eslint-disable jsdoc/no-undefined-types */
				const castProjectAssetType = /** @type {T} */ (projectAssetType);
				/* eslint-enable jsdoc/no-undefined-types */
				this._projectAssetType = castProjectAssetType;
			}
		}
	}

	/**
	 * This might be null if the asset hasn't been initialized yet, since the
	 * asset type needs to be read from disk. If you want to be sure that the
	 * asset type is loaded, use {@linkcode getProjectAssetTypeConstructor} instead.
	 */
	get projectAssetTypeConstructorSync() {
		if (!this._projectAssetType) {
			return null;
		}
		return /** @type {typeof import("./projectAssetType/ProjectAssetType.js").ProjectAssetType} */ (this._projectAssetType.constructor);
	}

	async waitForInit() {
		await this.initInstance.run();
	}

	async getProjectAssetType() {
		await this.waitForInit();
		return this._projectAssetType;
	}

	async getProjectAssetTypeConstructor() {
		await this.waitForInit();
		return this.projectAssetTypeConstructorSync;
	}

	/**
	 * @param {import("./AssetManager.js").AssetManager} assetManager
	 * @param {import("./ProjectAssetTypeManager.js").ProjectAssetTypeManager} assetTypeManager
	 * @param {import("./BuiltInAssetManager.js").BuiltInAssetManager} builtInAssetManager
	 * @param {import("../util/fileSystems/EditorFileSystem.js").EditorFileSystem?} fileSystem
	 * @param {ProjectAssetOptions} assetData
	 */
	static async guessAssetTypeAndCreate(assetManager, assetTypeManager, builtInAssetManager, fileSystem, assetData) {
		if (!assetData.assetType) {
			assetData.assetType = this.guessAssetTypeFromPath(assetTypeManager, assetData.path);
			assetData.forceAssetType = false;
		}
		const projectAsset = new ProjectAsset(assetManager, assetTypeManager, builtInAssetManager, fileSystem, assetData);
		return projectAsset;
	}

	/**
	 * @param {import("./ProjectAssetTypeManager.js").ProjectAssetTypeManager} projectAssetTypeManager
	 * @param {string[]} path
	 */
	static guessAssetTypeFromPath(projectAssetTypeManager, path = []) {
		if (!path || path.length <= 0) return null;
		const fileName = path[path.length - 1];
		const {extension} = getNameAndExtension(fileName);
		if (extension == "json" || !extension) return null;
		for (const assetType of projectAssetTypeManager.getAssetTypesForExtension(extension)) {
			return assetType.type;
		}
		return null;
	}

	/**
	 * Reads the asset data from disk and if it is stored as json, wrapped with
	 * editor metadata, returns the asset type from the metadata.
	 * @param {import("./BuiltInAssetManager.js").BuiltInAssetManager} builtInAssetManager
	 * @param {import("./ProjectAssetTypeManager.js").ProjectAssetTypeManager} projectAssetTypeManager
	 * @param {import("../util/fileSystems/EditorFileSystem.js").EditorFileSystem?} fileSystem Can be null for built-in assets only.
	 * @param {string[]} path
	 * @param {boolean} isBuiltIn
	 * @returns {Promise<string | null>}
	 */
	static async guessAssetTypeFromFile(builtInAssetManager, projectAssetTypeManager, fileSystem, path = [], isBuiltIn = false) {
		const assetType = this.guessAssetTypeFromPath(projectAssetTypeManager, path);
		if (assetType) return assetType;

		let json;
		if (isBuiltIn || !fileSystem) {
			json = await builtInAssetManager.fetchAsset(path);
		} else {
			json = await fileSystem.readJson(path);
		}
		return json?.assetType || null;
	}

	get fileName() {
		return this.path[this.path.length - 1];
	}

	get editable() {
		return !this.isBuiltIn || this.builtInAssetManager.allowAssetEditing;
	}

	// call AssetManager.makeAssetUuidConsistent() to also save
	// the uuid to asset settings file immediately
	makeUuidConsistent() {
		this.needsConsistentUuid = true;
	}

	/**
	 * @returns {boolean}
	 */
	get needsAssetSettingsSave() {
		if (this.forceAssetType) return true;
		if (this.needsConsistentUuid) return true;

		// if asset settings contains at least one key it needs to be saved
		return Object.keys(this.assetSettings).length > 0;
	}

	/**
	 * @param {string[]} newPath
	 */
	assetMoved(newPath) {
		this.path = newPath;
	}

	toJson() {
		/** @type {ProjectAssetJsonData} */
		const assetData = {
			path: this.path,
		};
		if (this.forceAssetType && this.assetType) {
			assetData.assetType = this.assetType;
		}
		if (Object.keys(this.assetSettings).length > 0) {
			assetData.assetSettings = this.assetSettings;
		}
		return assetData;
	}

	/**
	 * If this asset is a file that can be opened, open it
	 * either in the editor or in an external application.
	 * @param {import("../windowManagement/WindowManager.js").WindowManager} windowManager
	 */
	async open(windowManager) {
		await this.waitForInit();
		if (this._projectAssetType) {
			await this._projectAssetType.open(windowManager);
		}
	}

	async createNewLiveAssetData() {
		await this.waitForInit();
		if (!this._projectAssetType) return;
		const {liveAsset, editorData} = await this._projectAssetType.createNewLiveAssetData();
		let assetData = null;
		try {
			assetData = await this._projectAssetType.saveLiveAssetData(liveAsset, editorData);
		} catch (e) {
			if (e instanceof Error && e.message.includes("hasn't implemented saveLiveAssetData()")) {
				// Most ProjectAssetTypes don't actually implement this, which is fine in this case.
				// The error is only there to make `ProjectAsset.saveLiveAssetData()` throw when called
				// on a ProjectAssetType that doesn't implement saveLiveAssetData().
			} else {
				throw e;
			}
		}
		await this.writeAssetData(assetData);
	}

	/**
	 * Returns true if the asset data has been removed from disk.
	 * @async
	 * @returns {Promise<boolean>}
	 */
	async getIsDeleted() {
		await this.waitForInit();

		let exists = false;
		if (this.isBuiltIn || !this.fileSystem) {
			exists = await this.builtInAssetManager.exists(this.path);
		} else {
			exists = await this.fileSystem.exists(this.path);
		}
		return !exists;
	}

	/**
	 * @param {RecursionTracker?} recursionTracker
	 * @returns {Promise<LiveAssetData>}
	 */
	async getLiveAssetData(recursionTracker = null) {
		if (this.liveAsset || this.editorData) {
			return /** @type {LiveAssetData} */ ({
				liveAsset: this.liveAsset,
				editorData: this.editorData,
			});
		}

		if (this.isGettingLiveAssetData) {
			return await new Promise(r => this.onLiveAssetDataChangePromiseCbs.add(r));
		}

		this.isGettingLiveAssetData = true;
		const getLiveAssetSymbol = Symbol("get liveAsset");
		this.currentGettingLiveAssetSymbol = getLiveAssetSymbol;

		await this.waitForInit();
		if (!this._projectAssetType) {
			throw new Error(`Failed to get live asset data for asset at "${this.path.join("/")}" because the asset type couldn't be determined. Make sure your asset type is registered in the ProjectAssetTypeManager.`);
		}

		let fileData = null;
		let readFailed = false;
		try {
			fileData = await this.readAssetData();
		} catch (e) {
			// todo: implement a way to detect if the file has been deleted
			// and if that's the case give the user an option to remove the uuid
			// from assetSettings.json
			readFailed = true;
		}

		// if destroyLiveAssetData has been called before this Promise was finished
		if (getLiveAssetSymbol != this.currentGettingLiveAssetSymbol) {
			return await this.getLiveAssetData(recursionTracker);
		}

		if (readFailed) {
			console.warn("error getting live asset for " + this.path.join("/"));
			this.fireOnLiveAssetDataChangeCbs(/** @type {LiveAssetData} */ ({
				liveAsset: null,
				editorData: null,
			}));
			// @ts-expect-error TODO, throw an error instead of logging a warning
			return {};
		}

		const isRootRecursionTracker = !recursionTracker;
		if (!recursionTracker) {
			recursionTracker = new RecursionTracker(this.assetManager, this.uuid);
		}

		recursionTracker.pushProjectAssetToStack(this);

		const {liveAsset, editorData} = await this._projectAssetType.getLiveAssetData(fileData, recursionTracker);

		recursionTracker.popProjectAssetFromStack();

		if (isRootRecursionTracker) {
			if (recursionTracker.rootLoadingAsset) {
				recursionTracker.rootLoadingAsset.setLoadedAssetData({liveAsset, editorData});
			}
			await recursionTracker.waitForAll();
		}

		// if destroyLiveAssetData has been called before this Promise was finished
		if (getLiveAssetSymbol != this.currentGettingLiveAssetSymbol) {
			if ((liveAsset || editorData) && this._projectAssetType) {
				this._projectAssetType.destroyLiveAssetData(liveAsset, editorData);
			}
			this.clearRecursionTrackerLiveAssetChangeHandlers();
			return await this.getLiveAssetData(recursionTracker);
		}

		if (this.embeddedParentAsset) {
			this.embeddedParentAsset.addEmbeddedChildLiveAsset(this.embeddedParentPersistenceKey, liveAsset);
		}

		this.liveAsset = liveAsset;
		this.editorData = editorData;

		/** @type {LiveAssetData} */
		const liveAssetData = {};
		if (liveAsset) {
			liveAssetData.liveAsset = liveAsset;
		}
		if (editorData) {
			liveAssetData.editorData = editorData;
		}
		this.fireOnLiveAssetDataChangeCbs(liveAssetData);
		return liveAssetData;
	}

	/**
	 * @param {RecursionTracker?} recursionTracker
	 * @returns {Promise<LiveAssetType>}
	 */
	async getLiveAsset(recursionTracker = null) {
		const {liveAsset} = await this.getLiveAssetData(recursionTracker);
		return liveAsset;
	}

	/**
	 * @param {RecursionTracker?} recursionTracker
	 * @returns {Promise<EditorDataType?>}
	 */
	async getEditorData(recursionTracker = null) {
		const {editorData} = await this.getLiveAssetData(recursionTracker);
		return editorData ?? null;
	}

	/**
	 * Returns the currently loaded live asset synchronously.
	 * Returns null if the liveAsset isn't loaded yet.
	 * @returns {LiveAssetType?}
	 */
	getLiveAssetSync() {
		return this.liveAsset;
	}

	/**
	 * @param {() => void} cb
	 */
	onLiveAssetNeedsReplacement(cb) {
		this.onLiveAssetNeedsReplacementCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	removeOnLiveAssetNeedsReplacement(cb) {
		this.onLiveAssetNeedsReplacementCbs.delete(cb);
	}

	liveAssetNeedsReplacement() {
		this.destroyLiveAssetData();
		for (const cb of this.onLiveAssetNeedsReplacementCbs) {
			cb();
		}
	}

	/**
	 * @param {LiveAssetDataChangedCallback} cb
	 */
	onLiveAssetDataChange(cb) {
		this.onLiveAssetDataChangeCbs.add(cb);
	}

	/**
	 * @param {LiveAssetDataChangedCallback} cb
	 */
	removeOnLiveAssetDataChange(cb) {
		this.onLiveAssetDataChangeCbs.delete(cb);
	}

	/**
	 * Fires listeners that were added using {@linkcode onLiveAssetDataChange}
	 * and any pending promises that were created if {@linkcode getLiveAssetData}
	 * was called while an asset was currently loading.
	 *
	 * @private
	 * @param {LiveAssetData} liveAssetData
	 */
	fireOnLiveAssetDataChangeCbs(liveAssetData) {
		this.onLiveAssetDataChangeCbs.forEach(cb => cb(liveAssetData));
		this.onLiveAssetDataChangePromiseCbs.forEach(cb => cb(liveAssetData));
		this.onLiveAssetDataChangePromiseCbs.clear();
		this.isGettingLiveAssetData = false;
	}

	/**
	 * @template {import("./projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} TProjectAssetType
	 * @param {import("./AssetManager.js").AssetManager} assetManager
	 * @param {import("../../../src/util/mod.js").UuidString} assetUuid The asset to monitor for changes.
	 * @param {import("./liveAssetDataRecursionTracker/RecursionTracker.js").LiveAssetDataCallback<TProjectAssetType>} cb
	 */
	async registerRecursionTrackerLiveAssetChange(assetManager, assetUuid, cb) {
		const sym = this.currentRecursionTrackerLiveAssetChangeSym;
		/* eslint-disable jsdoc/no-undefined-types */
		/** @type {ProjectAsset<TProjectAssetType>?} */
		/* eslint-enable jsdoc/no-undefined-types */
		const projectAsset = await assetManager.getProjectAssetFromUuid(assetUuid);

		if (!projectAsset) return;

		// If either this projectAsset was destructed or its liveAsset was reloaded.
		if (sym != this.currentRecursionTrackerLiveAssetChangeSym) return;

		const registeredCallback = async () => {
			const liveAssetData = await projectAsset.getLiveAssetData();
			if (sym != this.currentRecursionTrackerLiveAssetChangeSym) return;
			cb(liveAssetData);
		};
		projectAsset.onLiveAssetNeedsReplacement(registeredCallback);
		this.registeredLiveAssetChangeHandlers.add({
			registeredCallback,
			registeredOnAsset: new WeakRef(projectAsset),
		});
	}

	clearRecursionTrackerLiveAssetChangeHandlers() {
		for (const handler of this.registeredLiveAssetChangeHandlers) {
			const projectAsset = handler.registeredOnAsset.deref();
			if (projectAsset) {
				projectAsset.removeOnLiveAssetNeedsReplacement(handler.registeredCallback);
			}
		}
		this.registeredLiveAssetChangeHandlers.clear();
		this.currentRecursionTrackerLiveAssetChangeSym = Symbol("recursionTrackerLiveAssetChange");
	}

	destroyLiveAssetData() {
		// @ts-expect-error TODO: make all existing `getLiveAssetData` promises reject
		this.fireOnLiveAssetDataChangeCbs({});
		if (this.isGettingLiveAssetData) {
			this.currentGettingLiveAssetSymbol = null;
		} else if ((this.liveAsset || this.editorData) && this._projectAssetType) {
			this._projectAssetType.destroyLiveAssetData(this.liveAsset, this.editorData);
			this.clearRecursionTrackerLiveAssetChangeHandlers();
			this.liveAsset = null;
			this.editorData = null;
		}
	}

	/**
	 * Gets called when one of the children of this asset is an embedded asset
	 * and it's just been changed.
	 * Depending on the capabilities of the project asset type, this will do
	 * one of the following:
	 * - Calls `saveLiveAssetData` that triggers a write to disk. Even though
	 * the embedded live asset hasn't been changed yet, it's embedded asset
	 * data has, so this is what will be written when
	 * `getAssetUuidOrEmbeddedAssetDataFromLiveAsset()` is called.
	 * - If the project asset type has `propertiesAssetContentStructure` set,
	 * it likely doesn't implement `saveLiveAssetData`, so in this case
	 * we'll use the structure to determine what data to write. We'll basically
	 * read from disk first, inject the embedded asset data, and then write again.
	 * - TODO: If the project asset type doesn't support live assets, for the moment
	 * it will write 'null' to disk. We should probably throw an error here though.
	 */
	async childEmbeddedAssetNeedsSave() {
		const structure = this.projectAssetTypeConstructorSync?.propertiesAssetContentStructure;
		if (structure) {
			// TODO
			throw new Error("Not yet implemented");
		} else {
			await this.saveLiveAssetData();
		}
	}

	/**
	 * Writes asset data to disk based on the current live asset. Note that if
	 * the live asset does not exist, it will be created by reading from disk
	 * first and then writing the result again. So if `liveAssetNeedsReplacement`
	 * has been triggered, either by this asset or by one of it's child assets,
	 * this will essentially read and write the same data. To prevent this,
	 * make sure you call `saveLiveAssetData` before `liveAssetNeedsReplacement`.
	 */
	async saveLiveAssetData() {
		await this.waitForInit();
		if (!this._projectAssetType) return;
		const liveAsset = await this.getLiveAsset();
		const editorData = await this.getEditorData();
		const assetData = await this._projectAssetType.saveLiveAssetData(liveAsset, editorData);
		await this.writeAssetData(assetData);
	}

	async getPropertiesAssetContentConstructor() {
		await this.waitForInit();
		if (!this.projectAssetTypeConstructorSync) return null;
		return this.projectAssetTypeConstructorSync.propertiesAssetContentConstructor;
	}

	async getPropertiesAssetContentStructure() {
		await this.waitForInit();
		if (!this.projectAssetTypeConstructorSync) return null;
		return this.projectAssetTypeConstructorSync.propertiesAssetContentStructure;
	}

	async getPropertiesAssetSettingsStructure() {
		await this.waitForInit();
		if (!this.projectAssetTypeConstructorSync) return null;
		return this.projectAssetTypeConstructorSync.assetSettingsStructure;
	}

	/**
	 * The returned type depends on the `ProjectAssetType` configuration.
	 * - If `ProjectAssetType.storeInProjectAsJson` is `true`, the returned type is a JSON object.
	 * - If `ProjectAssetType.storeInProjectAsText` is `true`, the returned type is a string.
	 * - Returns a BlobPart otherwise.
	 * @returns {Promise<FileDataType>}
	 */
	async readAssetData() {
		await this.waitForInit();

		if (!this.projectAssetTypeConstructorSync) {
			throw new Error("Unable to read asset data without a ProjectAssetType");
		}

		/** @type {"json" | "text" | "binary"} */
		let format = "binary";
		if (this.projectAssetTypeConstructorSync.storeInProjectAsJson) {
			format = "json";
		} else if (this.projectAssetTypeConstructorSync.storeInProjectAsText) {
			format = "text";
		}

		let fileData = null;
		if (this.isBuiltIn || !this.fileSystem) {
			fileData = await this.builtInAssetManager.fetchAsset(this.path, format);
		} else if (this.isEmbedded) {
			fileData = this.readEmbeddedAssetData();
		} else if (format == "json") {
			fileData = await this.fileSystem.readJson(this.path);
		} else if (format == "text") {
			fileData = await this.fileSystem.readText(this.path);
		} else {
			fileData = await this.fileSystem.readFile(this.path);
		}

		if (format == "json" && this.projectAssetTypeConstructorSync.wrapProjectJsonWithEditorMetaData && !this.isEmbedded) {
			fileData = fileData.asset || {};
		}
		return fileData;
	}

	/**
	 * @param {FileDataType} fileData
	 */
	async writeAssetData(fileData) {
		await this.waitForInit();

		if (!this.projectAssetTypeConstructorSync) {
			throw new Error("Unable to write asset data without a ProjectAssetType");
		}

		if (this.projectAssetTypeConstructorSync.storeInProjectAsJson) {
			if (this.isEmbedded) {
				await this.writeEmbeddedAssetData(fileData);
			} else {
				let json = null;
				if (this.projectAssetTypeConstructorSync.wrapProjectJsonWithEditorMetaData) {
					json = {
						assetType: this.projectAssetTypeConstructorSync.type,
						asset: fileData,
					};
				} else {
					json = fileData;
				}
				if (this.isBuiltIn || !this.fileSystem) {
					await this.builtInAssetManager.writeJson(this.path, json);
				} else {
					await this.fileSystem.writeJson(this.path, json);
				}
			}
		} else if (this.projectAssetTypeConstructorSync.storeInProjectAsText) {
			if (this.isBuiltIn || !this.fileSystem) {
				await this.builtInAssetManager.writeText(this.path, fileData);
			} else {
				const fileDataStr = /** @type {string} */ (fileData);
				await this.fileSystem.writeText(this.path, fileDataStr);
			}
		} else if (this.isBuiltIn || !this.fileSystem) {
			await this.builtInAssetManager.writeBinary(this.path, fileData);
		} else {
			const fileDataBlob = /** @type {BlobPart} */ (fileData);
			await this.fileSystem.writeFile(this.path, fileDataBlob);
		}
	}

	/**
	 * Same as {@linkcode readAssetData} but returns the data synchronously
	 * without a promise. Throws if the ProjectAsset is not an embedded asset.
	 * @returns {FileDataType}
	 */
	readEmbeddedAssetData() {
		if (!this.isEmbedded) {
			throw new Error("Unable to read embeddedassetData, asset is not an embedded asset.");
		}
		return structuredClone(this.currentEmbeddedAssetData);
	}

	/**
	 * Same as {@linkcode writeEmbeddedAssetData} but only saves the new state
	 * in memory. Throws if the ProjectAsset is not an embedded asset.
	 * @param {FileDataType} fileData
	 */
	writeEmbeddedAssetDataSync(fileData) {
		if (!this.isEmbedded) {
			throw new Error("Unable to write embeddedassetData, asset is not an embedded asset.");
		}
		this.currentEmbeddedAssetData = structuredClone(fileData);
	}

	/**
	 * Updates the asset data in memory and notifies the parent ProjectAsset
	 * that has embedded this asset. The parent will save itself to disk using
	 * the new data. Throws if the ProjectAsset is not an embedded asset.
	 * @param {FileDataType} fileData
	 */
	async writeEmbeddedAssetData(fileData) {
		this.writeEmbeddedAssetDataSync(fileData);
		if (this.embeddedParentAsset) await this.embeddedParentAsset.childEmbeddedAssetNeedsSave();
	}

	/**
	 * Gets called when a new embedded asset is created with this asset as parent.
	 * This adds the live asset to the list of previous live assets so that it can be queried later
	 * using {@linkcode getPreviousEmbeddedLiveAsset}.
	 *
	 * @param {string} key
	 * @param {object} liveAsset
	 */
	addEmbeddedChildLiveAsset(key, liveAsset) {
		this.previousLiveAssets.set(key, new WeakRef(liveAsset));
		this.cleanupOldPreviousLiveAssets();
	}

	/**
	 * @param {string} key
	 */
	getPreviousEmbeddedLiveAsset(key) {
		const ref = this.previousLiveAssets.get(key);
		this.cleanupOldPreviousLiveAssets();
		if (!ref) return null;
		const deref = ref?.deref();
		return deref ?? null;
	}

	/**
	 * @private
	 */
	cleanupOldPreviousLiveAssets() {
		for (const [key, ref] of this.previousLiveAssets.entries()) {
			if (!ref.deref()) {
				this.previousLiveAssets.delete(key);
			}
		}
	}

	async getAssetTypeUuid() {
		await this.waitForInit();
		if (!this.projectAssetTypeConstructorSync) return null;
		return this.projectAssetTypeConstructorSync.typeUuid;
	}

	/**
	 * @param {Object} assetSettingOverrides
	 * @returns {Promise<string | BufferSource | Blob | null>}
	 */
	async getBundledAssetData(assetSettingOverrides = {}) {
		await this.waitForInit();
		if (!this.projectAssetTypeConstructorSync || !this._projectAssetType) return null;

		let binaryData = await this._projectAssetType.createBundledAssetData(assetSettingOverrides);
		if (!binaryData) {
			const usedAssetLoaderType = this.projectAssetTypeConstructorSync.usedAssetLoaderType;
			if (usedAssetLoaderType && usedAssetLoaderType.prototype instanceof AssetLoaderTypeGenericStructure) {
				/** @type {FileDataType} */
				let assetData = await this.readAssetData();

				const structure = this.projectAssetTypeConstructorSync.propertiesAssetContentStructure;
				if (structure) {
					const treeView = new PropertiesTreeView();
					treeView.generateFromSerializableStructure(structure);
					treeView.fillSerializableStructureValues(assetData);
					const newAssetData = treeView.getSerializableStructureValues(structure, {purpose: "binarySerialization"});
					assetData = /** @type {FileDataType} */ (newAssetData);
				}

				const castAssetLoaderType = /** @type {typeof AssetLoaderTypeGenericStructure} */ (usedAssetLoaderType);
				if (!castAssetLoaderType.binarySerializationOpts) {
					throw new Error("Failed to get bundled asset data. `binarySerializationOpts` is not implemented.");
				}
				binaryData = objectToBinary(assetData, {
					...castAssetLoaderType.binarySerializationOpts,
					editorAssetManager: this.assetManager,
				});
			}
		}
		if (!binaryData) {
			if (this.isBuiltIn || !this.fileSystem) {
				binaryData = await this.builtInAssetManager.fetchAsset(this.path, "binary");
			} else {
				binaryData = await this.fileSystem.readFile(this.path);
			}
		}
		return binaryData;
	}

	/**
	 * @returns {AsyncGenerator<import("../../../src/util/mod.js").UuidString>}
	 */
	async *getReferencedAssetUuids() {
		await this.waitForInit();
		if (!this.projectAssetTypeConstructorSync || !this._projectAssetType) return;

		const usedAssetLoaderType = this.projectAssetTypeConstructorSync.usedAssetLoaderType;
		if (usedAssetLoaderType && usedAssetLoaderType.prototype instanceof AssetLoaderTypeGenericStructure) {
			const assetData = await this.readAssetData();

			const castAssetLoaderType = /** @type {typeof AssetLoaderTypeGenericStructure} */ (usedAssetLoaderType);
			if (!castAssetLoaderType.binarySerializationOpts) {
				throw new Error("Failed to get referenced asset uuids. `binarySerializationOpts` is not implemented.");
			}

			const binarySerializationOpts = castAssetLoaderType.binarySerializationOpts;

			/** @type {import("../../../src/util/mod.js").UuidString[]} */
			const referencedUuids = [];
			objectToBinary(assetData, {
				...binarySerializationOpts,
				transformValueHook: args => {
					let {value, type} = args;
					if (binarySerializationOpts.transformValueHook) {
						value = binarySerializationOpts.transformValueHook(args);
					}

					if (type == StorageType.ASSET_UUID) {
						const castValue = /** @type {import("../../../src/util/mod.js").UuidString} */ (value);
						referencedUuids.push(castValue);
					}
					return value;
				},
			});
			for (const uuid of referencedUuids) {
				yield uuid;
			}
		}

		for await (const uuid of this._projectAssetType.getReferencedAssetUuids()) {
			yield uuid;
		}
	}

	async fileChangedExternally() {
		await this.waitForInit();
		if (!this._projectAssetType) return;
		await this._projectAssetType.fileChangedExternally();
	}
}
