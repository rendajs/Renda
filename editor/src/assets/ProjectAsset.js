import {getEditorInstanceCertain} from "../editorInstance.js";
import {AssetLoaderTypeGenericStructure, BinaryComposer} from "../../../src/mod.js";
import {getNameAndExtension} from "../Util/FileSystems/PathUtil.js";
import {PropertiesTreeView} from "../UI/PropertiesTreeView/PropertiesTreeView.js";
import {StorageType} from "../../../src/util/BinaryComposer.js";
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
 * @property {*} [assetType]
 * @property {boolean} [forceAssetType]
 * @property {boolean} [isBuiltIn]
 */

/**
 * @typedef {Object} ProjectAssetJsonData
 * @property {string[]} path
 * @property {string} [assetType]
 * @property {Object} [assetSettings]
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
	 * @param {import("../Util/FileSystems/EditorFileSystem.js").EditorFileSystem?} fileSystem
	 * @param {ProjectAssetOptions} options
	 */
	constructor(assetManager, assetTypeManager, builtInAssetManager, fileSystem, {
		uuid,
		path = [],
		assetSettings = {},
		assetType = null,
		forceAssetType = false,
		isBuiltIn = false,
	}) {
		this.assetManager = assetManager;
		this.assetTypeManager = assetTypeManager;
		this.builtInAssetManager = builtInAssetManager;

		if (!fileSystem && !isBuiltIn) {
			throw new Error("fileSystem can only be null for builtIn assets");
		}
		/**
		 * This is null for builtIn assets.
		 * @type {import("../Util/FileSystems/EditorFileSystem.js").EditorFileSystem?}
		 */
		this.fileSystem = fileSystem;

		/** @type {import("../../../src/util/mod.js").UuidString} */
		this.uuid = uuid;
		/** @type {Array<string>}*/
		this.path = path;
		/** @type {AssetSettigsType} */
		this.assetSettings = assetSettings;
		/** @type {string | null} */
		this.assetType = assetType;
		this.forceAssetType = forceAssetType;
		this.needsConsistentUuid = false;
		this.isBuiltIn = isBuiltIn;

		/** @type {T?} */
		this._projectAssetType = null;
		this.isGettingLiveAssetData = false;
		this.currentGettingLiveAssetSymbol = null;
		/** @type {Set<(liveAssetData: LiveAssetData) => any>} */
		this.onLiveAssetDataGetCbs = new Set();
		/** @type {LiveAssetType?} */
		this.liveAsset = null;
		/** @type {EditorDataType?} */
		this.editorData = null;

		this.initInstance = new SingleInstancePromise(async () => await this.init());
		this.initInstance.run();

		/** @type {Set<() => void>} */
		this.onNewLiveAssetInstanceCbs = new Set();

		/**
		 * Whenever {@linkcode RecursionTracker.getLiveAssetData} is called with
		 * `repeatOnLiveAssetChange`, a handler is registered with {@linkcode onNewLiveAssetInstance}.
		 * To ensure all handlers are removed again when the live asset
		 * is unloaded or the ProjectAsset is destructed, we keep track of an
		 * extra list of registered handlers.
		 *
		 * So there's two lists:
		 * - {@linkcode onNewLiveAssetInstanceCbs} - The actual handlers, stored
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
		this.onNewLiveAssetInstanceCbs.clear();
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
				const projectAssetType = new AssetTypeConstructor(getEditorInstanceCertain(), this, this.assetManager, this.assetTypeManager);
				/* eslint-disable jsdoc/no-undefined-types */
				const castProjectAssetType = /** @type {T} */ (projectAssetType);
				/* eslint-enable jsdoc/no-undefined-types */
				this._projectAssetType = castProjectAssetType;
			}
		}
	}

	get projectAssetTypeConstructor() {
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

	/**
	 * @param {import("./AssetManager.js").AssetManager} assetManager
	 * @param {import("./ProjectAssetTypeManager.js").ProjectAssetTypeManager} assetTypeManager
	 * @param {import("./BuiltInAssetManager.js").BuiltInAssetManager} builtInAssetManager
	 * @param {import("../Util/FileSystems/EditorFileSystem.js").EditorFileSystem?} fileSystem
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
	 * @param {import("../Util/FileSystems/EditorFileSystem.js").EditorFileSystem?} fileSystem Can be null for built-in assets only.
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
		const assetData = await this._projectAssetType.saveLiveAssetData(liveAsset, editorData);
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
			/** @type {LiveAssetData} */
			const liveAssetData = {};
			if (this.liveAsset) {
				liveAssetData.liveAsset = this.liveAsset;
			}
			if (this.editorData) {
				liveAssetData.editorData = this.editorData;
			}
			return liveAssetData;
		}

		if (this.isGettingLiveAssetData) {
			return await new Promise(r => this.onLiveAssetDataGetCbs.add(r));
		}

		this.isGettingLiveAssetData = true;
		const getLiveAssetSymbol = Symbol("get liveAsset");
		this.currentGettingLiveAssetSymbol = getLiveAssetSymbol;

		await this.waitForInit();
		if (!this._projectAssetType) return {};

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
			this.fireOnLiveAssetDataGetCbs({});
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

		/** @type {LiveAssetData} */
		const liveAssetData = {};
		if (liveAsset) {
			liveAssetData.liveAsset = liveAsset;
		}
		if (editorData) {
			liveAssetData.editorData = editorData;
		}
		this.fireOnLiveAssetDataGetCbs(liveAssetData);
		return liveAssetData;
	}

	/**
	 * @param {RecursionTracker?} recursionTracker
	 * @returns {Promise<LiveAssetType?>}
	 */
	async getLiveAsset(recursionTracker = null) {
		const {liveAsset} = await this.getLiveAssetData(recursionTracker);
		return liveAsset ?? null;
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
	getLiveAssetImmediate() {
		return this.liveAsset;
	}

	/**
	 * @param {() => void} cb
	 */
	onNewLiveAssetInstance(cb) {
		this.onNewLiveAssetInstanceCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	removeOnNewLiveAssetInstance(cb) {
		this.onNewLiveAssetInstanceCbs.delete(cb);
	}

	liveAssetNeedsReplacement() {
		this.destroyLiveAssetData();
		for (const cb of this.onNewLiveAssetInstanceCbs) {
			cb();
		}
	}

	/**
	 * @param {LiveAssetData} liveAssetData
	 */
	fireOnLiveAssetDataGetCbs(liveAssetData) {
		for (const cb of this.onLiveAssetDataGetCbs) {
			cb(liveAssetData);
		}
		this.onLiveAssetDataGetCbs.clear();
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
		const projectAsset = await assetManager.getProjectAsset(assetUuid);

		if (!projectAsset) return;

		// If either this projectAsset was destructed or its liveAsset was reloaded.
		if (sym != this.currentRecursionTrackerLiveAssetChangeSym) return;

		const registeredCallback = async () => {
			const liveAssetData = await projectAsset.getLiveAssetData();
			if (sym != this.currentRecursionTrackerLiveAssetChangeSym) return;
			cb(liveAssetData);
		};
		projectAsset.onNewLiveAssetInstance(registeredCallback);
		this.registeredLiveAssetChangeHandlers.add({
			registeredCallback,
			registeredOnAsset: new WeakRef(projectAsset),
		});
	}

	clearRecursionTrackerLiveAssetChangeHandlers() {
		for (const handler of this.registeredLiveAssetChangeHandlers) {
			const projectAsset = handler.registeredOnAsset.deref();
			if (projectAsset) {
				projectAsset.removeOnNewLiveAssetInstance(handler.registeredCallback);
			}
		}
		this.registeredLiveAssetChangeHandlers.clear();
		this.currentRecursionTrackerLiveAssetChangeSym = Symbol("recursionTrackerLiveAssetChange");
	}

	destroyLiveAssetData() {
		if (this.isGettingLiveAssetData) {
			this.fireOnLiveAssetDataGetCbs({});
			this.currentGettingLiveAssetSymbol = null;
		} else if ((this.liveAsset || this.editorData) && this._projectAssetType) {
			this._projectAssetType.destroyLiveAssetData(this.liveAsset, this.editorData);
			this.clearRecursionTrackerLiveAssetChangeHandlers();
			this.liveAsset = null;
		}
	}

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
		if (!this.projectAssetTypeConstructor) return null;
		return this.projectAssetTypeConstructor.propertiesAssetContentConstructor;
	}

	async getPropertiesAssetContentStructure() {
		await this.waitForInit();
		if (!this.projectAssetTypeConstructor) return null;
		return this.projectAssetTypeConstructor.propertiesAssetContentStructure;
	}

	async getPropertiesAssetSettingsStructure() {
		await this.waitForInit();
		if (!this.projectAssetTypeConstructor) return null;
		return this.projectAssetTypeConstructor.assetSettingsStructure;
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

		if (!this.projectAssetTypeConstructor) {
			throw new Error("Unable to read asset data without a ProjectAssetType");
		}

		/** @type {"json" | "text" | "binary"} */
		let format = "binary";
		if (this.projectAssetTypeConstructor.storeInProjectAsJson) {
			format = "json";
		} else if (this.projectAssetTypeConstructor.storeInProjectAsText) {
			format = "text";
		}

		let fileData = null;
		if (this.isBuiltIn || !this.fileSystem) {
			fileData = await this.builtInAssetManager.fetchAsset(this.path, format);
		} else if (format == "json") {
			fileData = await this.fileSystem.readJson(this.path);
		} else if (format == "text") {
			fileData = await this.fileSystem.readText(this.path);
		} else {
			fileData = await this.fileSystem.readFile(this.path);
		}

		if (format == "json" && this.projectAssetTypeConstructor.wrapProjectJsonWithEditorMetaData) {
			fileData = fileData.asset || {};
		}
		return fileData;
	}

	/**
	 * @param {FileDataType} fileData
	 */
	async writeAssetData(fileData) {
		await this.waitForInit();

		if (!this.projectAssetTypeConstructor) {
			throw new Error("Unable to write asset data without a ProjectAssetType");
		}

		if (this.projectAssetTypeConstructor.storeInProjectAsJson) {
			let json = null;
			if (this.projectAssetTypeConstructor.wrapProjectJsonWithEditorMetaData) {
				json = {
					assetType: this.projectAssetTypeConstructor.type,
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
		} else if (this.projectAssetTypeConstructor.storeInProjectAsText) {
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
			await this.fileSystem.writeBinary(this.path, fileDataBlob);
		}
	}

	async getAssetTypeUuid() {
		await this.waitForInit();
		if (!this.projectAssetTypeConstructor) return null;
		return this.projectAssetTypeConstructor.typeUuid;
	}

	/**
	 * @param {Object} assetSettingOverrides
	 */
	async getBundledAssetData(assetSettingOverrides = {}) {
		await this.waitForInit();
		if (!this.projectAssetTypeConstructor || !this._projectAssetType) return null;

		let binaryData = await this._projectAssetType.createBundledAssetData(assetSettingOverrides);
		if (!binaryData) {
			const usedAssetLoaderType = this.projectAssetTypeConstructor.usedAssetLoaderType;
			if (usedAssetLoaderType && usedAssetLoaderType.prototype instanceof AssetLoaderTypeGenericStructure) {
				let assetData = await this.readAssetData();

				const structure = this.projectAssetTypeConstructor.propertiesAssetContentStructure;
				if (structure) {
					const treeView = new PropertiesTreeView();
					treeView.generateFromSerializableStructure(structure);
					treeView.fillSerializableStructureValues(assetData);
					assetData = treeView.getSerializableStructureValues(structure, {purpose: "binaryComposer"});
				}

				const castAssetLoaderType = /** @type {typeof AssetLoaderTypeGenericStructure} */ (usedAssetLoaderType);
				if (!castAssetLoaderType.binaryComposerOpts) {
					throw new Error("Failed to get bundled asset data. `binaryComposerOpts` is not implemented.");
				}
				binaryData = BinaryComposer.objectToBinary(assetData, {
					...castAssetLoaderType.binaryComposerOpts,
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
		if (!this.projectAssetTypeConstructor || !this._projectAssetType) return;

		const usedAssetLoaderType = this.projectAssetTypeConstructor.usedAssetLoaderType;
		if (usedAssetLoaderType && usedAssetLoaderType.prototype instanceof AssetLoaderTypeGenericStructure) {
			const assetData = await this.readAssetData();

			const castAssetLoaderType = /** @type {typeof AssetLoaderTypeGenericStructure} */ (usedAssetLoaderType);
			if (!castAssetLoaderType.binaryComposerOpts) {
				throw new Error("Failed to get referenced asset uuids. `binaryComposerOpts` is not implemented.");
			}

			const binaryComposerOpts = castAssetLoaderType.binaryComposerOpts;

			/** @type {import("../../../src/util/mod.js").UuidString[]} */
			const referencedUuids = [];
			BinaryComposer.objectToBinary(assetData, {
				...binaryComposerOpts,
				transformValueHook: args => {
					let {value, type} = args;
					if (binaryComposerOpts.transformValueHook) {
						value = binaryComposerOpts.transformValueHook(args);
					}

					if (type == StorageType.ASSET_UUID) {
						referencedUuids.push(value);
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
