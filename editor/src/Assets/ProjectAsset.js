import editor from "../editorInstance.js";
import {AssetLoaderTypeGenericStructure, BinaryComposer} from "../../../src/index.js";
import {getNameAndExtension} from "../Util/FileSystems/PathUtil.js";
import PropertiesTreeView from "../UI/PropertiesTreeView/PropertiesTreeView.js";
import {StorageType} from "../../../src/Util/BinaryComposer.js";
import SingleInstancePromise from "../../../src/Util/SingleInstancePromise.js";
import {RecursionTracker} from "./LiveAssetDataRecursionTracker/RecursionTracker.js";

/** @typedef {Object | string | File} ProjectAssetFileData */

export default class ProjectAsset {
	constructor({
		uuid = null,
		path = [],
		assetSettings = {},
		assetType = null,
		forceAssetType = false,
		isBuiltIn = false,
	} = {}) {
		/** @type {import("../Util/Util.js").UuidString} */
		this.uuid = uuid;
		/** @type {Array<string>}*/
		this.path = path;
		this.assetSettings = assetSettings;
		this.assetType = assetType;
		this.forceAssetType = forceAssetType;
		this.needsConsistentUuid = false;
		this.isBuiltIn = isBuiltIn;
		/**
		 * Whether the asset data is no longer available on disk
		 * null if unknown.
		 * @type {?boolean}
		 */
		this._deletedState = null;

		/** @type {import("./ProjectAssetType/ProjectAssetType.js").default} */
		this._projectAssetType = null;
		this.isGettingLiveAssetData = false;
		this.currentGettingLiveAssetSymbol = null;
		this.onLiveAssetDataGetCbs = new Set();
		this.liveAsset = null;
		this.editorData = null;

		this.initInstance = new SingleInstancePromise(async _ => await this.init());
		this.initInstance.run();

		this.onNewLiveAssetInstanceCbs = new Set();

		this.destructed = false;
	}

	destructor() {
		this.destructed = true;

		this.destroyLiveAssetData();
		this.assetSettings = null;
		this._projectAssetType = null;
		this.onNewLiveAssetInstanceCbs.clear();
	}

	async init() {
		if (!this.assetType) {
			try {
				this.assetType = await ProjectAsset.guessAssetTypeFromFile(this.path, this.isBuiltIn);
			} catch (e) {
				this.assetType = null;
			}
		}
		if (this.destructed) return;

		const AssetTypeConstructor = editor.projectAssetTypeManager.getAssetType(this.assetType);
		if (AssetTypeConstructor) {
			this._projectAssetType = new AssetTypeConstructor(this);
		}
	}

	get projectAssetTypeConstructor() {
		return /** @type {typeof import("./ProjectAssetType/ProjectAssetType.js").default} */ (this._projectAssetType.constructor);
	}

	async waitForInit() {
		await this.initInstance.run();
	}

	async getProjectAssetType() {
		await this.waitForInit();
		return this._projectAssetType;
	}

	static async fromJsonData(uuid, assetData) {
		if (!assetData.assetType) {
			assetData.assetType = this.guessAssetTypeFromPath(assetData.path);
			assetData.forceAssetType = false;
		}
		const projectAsset = new ProjectAsset({uuid, ...assetData});
		return projectAsset;
	}

	static guessAssetTypeFromPath(path = []) {
		if (!path || path.length <= 0) return null;
		const fileName = path[path.length - 1];
		const {extension} = getNameAndExtension(fileName);
		if (extension == "json") return null;
		for (const assetType of editor.projectAssetTypeManager.getAssetTypesForExtension(extension)) {
			return assetType.type;
		}
		return null;
	}

	static async guessAssetTypeFromFile(path = [], isBuiltIn = false) {
		const assetType = this.guessAssetTypeFromPath(path);
		if (assetType) return assetType;

		let json;
		if (isBuiltIn) {
			json = await editor.builtInAssetManager.fetchAsset(path);
		} else {
			json = await editor.projectManager.currentProjectFileSystem.readJson(path);
		}
		return json?.assetType || null;
	}

	get fileName() {
		return this.path[this.path.length - 1];
	}

	get editable() {
		return !this.isBuiltIn || editor.builtInAssetManager.allowAssetEditing;
	}

	// call AssetManager.makeAssetUuidConsistent() to also save
	// the uuid to asset settings file immediately
	makeUuidConsistent() {
		this.needsConsistentUuid = true;
	}

	get needsAssetSettingsSave() {
		if (this.forceAssetType) return true;
		if (this.needsConsistentUuid) return true;

		// if asset settings contains at least one key it needs to be saved
		return Object.keys(this.assetSettings).length > 0;
	}

	assetMoved(newPath) {
		this.path = newPath;
	}

	toJson() {
		const assetData = {
			path: this.path,
		};
		if (this.forceAssetType) {
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
	 */
	async open() {
		await this.waitForInit();
		await this._projectAssetType.open();
	}

	async createNewLiveAssetData() {
		await this.waitForInit();
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
		if (this._deletedState == null) {
			await this.verifyDeletedState();
		}
		return this._deletedState;
	}

	async verifyDeletedState() {
		await this.waitForInit();

		let exists = false;
		if (this.isBuiltIn) {
			exists = await editor.builtInAssetManager.exists(this.path);
		} else {
			exists = await editor.projectManager.currentProjectFileSystem.exists(this.path);
		}
		this._deletedState = !exists;
	}

	/**
	 * @param {RecursionTracker} recursionTracker
	 */
	async getLiveAssetData(recursionTracker = null) {
		if (this.liveAsset || this.editorData) {
			return {
				liveAsset: this.liveAsset,
				editorData: this.editorData,
			};
		}

		if (this.isGettingLiveAssetData) {
			return await new Promise(r => this.onLiveAssetDataGetCbs.add(r));
		}

		this.isGettingLiveAssetData = true;
		const getLiveAssetSymbol = Symbol("get liveAsset");
		this.currentGettingLiveAssetSymbol = getLiveAssetSymbol;
		await this.waitForInit();
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
			this.fireOnLiveAssetDataGetCbs({liveAsset: null, editorData: null});
			return {liveAsset: null, editorData: null};
		}

		const isRootRecursionTracker = !recursionTracker;
		if (!recursionTracker) {
			recursionTracker = new RecursionTracker(editor.projectManager.assetManager, this.uuid);
		}

		const {liveAsset, editorData} = await this._projectAssetType.getLiveAssetData(fileData, recursionTracker);

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
			return await this.getLiveAssetData(recursionTracker);
		}

		this.liveAsset = liveAsset || null;
		this.editorData = editorData || null;
		this.fireOnLiveAssetDataGetCbs({
			liveAsset: this.liveAsset,
			editorData: this.editorData,
		});
		return {
			liveAsset: this.liveAsset,
			editorData: this.editorData,
		};
	}

	/**
	 * @param {RecursionTracker} recursionTracker
	 */
	async getLiveAsset(recursionTracker = null) {
		const {liveAsset} = await this.getLiveAssetData(recursionTracker);
		return liveAsset;
	}

	/**
	 * @param {RecursionTracker} recursionTracker
	 */
	async getEditorData(recursionTracker = null) {
		const {editorData} = await this.getLiveAssetData(recursionTracker);
		return editorData;
	}

	// returns the currently loaded live asset synchronously
	// returns null if the liveAsset isn't init yet
	getLiveAssetImmediate() {
		return this.liveAsset;
	}

	onNewLiveAssetInstance(cb) {
		this.onNewLiveAssetInstanceCbs.add(cb);
	}

	removeOnNewLiveAssetInstance(cb) {
		this.onNewLiveAssetInstanceCbs.delete(cb);
	}

	liveAssetNeedsReplacement() {
		this.destroyLiveAssetData();
		for (const cb of this.onNewLiveAssetInstanceCbs) {
			cb();
		}
	}

	fireOnLiveAssetDataGetCbs(liveAssetData) {
		for (const cb of this.onLiveAssetDataGetCbs) {
			cb(liveAssetData);
		}
		this.onLiveAssetDataGetCbs.clear();
		this.isGettingLiveAssetData = false;
	}

	destroyLiveAssetData() {
		if (this.isGettingLiveAssetData) {
			this.fireOnLiveAssetDataGetCbs({liveAsset: null, editorData: null});
			this.currentGettingLiveAssetSymbol = null;
		} else if ((this.liveAsset || this.editorData) && this._projectAssetType) {
			this._projectAssetType.destroyLiveAssetData(this.liveAsset, this.editorData);
			this.liveAsset = null;
		}
	}

	async saveLiveAssetData() {
		await this.waitForInit();
		const liveAsset = await this.getLiveAsset();
		const editorData = await this.getEditorData();
		const assetData = await this._projectAssetType.saveLiveAssetData(liveAsset, editorData);
		await this.writeAssetData(assetData);
	}

	async getPropertiesAssetContentConstructor() {
		await this.waitForInit();
		if (!this._projectAssetType) return null;
		return this.projectAssetTypeConstructor.propertiesAssetContentConstructor;
	}

	async getPropertiesAssetContentStructure() {
		await this.waitForInit();
		if (!this._projectAssetType) return null;
		return this.projectAssetTypeConstructor.propertiesAssetContentStructure;
	}

	async getPropertiesAssetSettingsStructure() {
		await this.waitForInit();
		if (!this._projectAssetType) return null;
		return this.projectAssetTypeConstructor.assetSettingsStructure;
	}

	/**
	 * The returned type depends on the value of ProjectAssetType.storeInProjectAsJson
	 * and ProjectAssetType.storeInProjectAsText.
	 * @returns {Promise<?ProjectAssetFileData>}
	 */
	async readAssetData() {
		await this.waitForInit();

		let format = "binary";
		if (this.projectAssetTypeConstructor.storeInProjectAsJson) {
			format = "json";
		} else if (this.projectAssetTypeConstructor.storeInProjectAsText) {
			format = "text";
		}

		let fileData = null;
		if (this.isBuiltIn) {
			fileData = await editor.builtInAssetManager.fetchAsset(this.path, format);
		} else if (format == "json") {
			fileData = await editor.projectManager.currentProjectFileSystem.readJson(this.path);
		} else if (format == "text") {
			fileData = await editor.projectManager.currentProjectFileSystem.readText(this.path);
		} else {
			fileData = await editor.projectManager.currentProjectFileSystem.readFile(this.path);
		}

		if (format == "json" && this.projectAssetTypeConstructor.wrapProjectJsonWithEditorMetaData) {
			fileData = fileData.asset || {};
		}
		return fileData;
	}

	async writeAssetData(fileData) {
		await this.waitForInit();

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
			if (this.isBuiltIn) {
				await editor.builtInAssetManager.writeJson(this.path, json);
			} else {
				await editor.projectManager.currentProjectFileSystem.writeJson(this.path, json);
			}
		} else if (this.projectAssetTypeConstructor.storeInProjectAsText) {
			if (this.isBuiltIn) {
				await editor.builtInAssetManager.writeText(this.path, fileData);
			} else {
				await editor.projectManager.currentProjectFileSystem.writeText(this.path, fileData);
			}
		} else if (this.isBuiltIn) {
			await editor.builtInAssetManager.writeBinary(this.path, fileData);
		} else {
			await editor.projectManager.currentProjectFileSystem.writeBinary(this.path, fileData);
		}
	}

	async getAssetTypeUuid() {
		await this.waitForInit();
		return this.projectAssetTypeConstructor.typeUuid;
	}

	async getBundledAssetData(assetSettingOverrides) {
		await this.waitForInit();
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

				binaryData = BinaryComposer.objectToBinary(assetData, {
					...usedAssetLoaderType.binaryComposerOpts,
					editorAssetManager: editor.projectManager.assetManager,
				});
			}
		}
		if (!binaryData) {
			if (this.isBuiltIn) {
				binaryData = await editor.builtInAssetManager.fetchAsset(this.path, "binary");
			} else {
				binaryData = await editor.projectManager.currentProjectFileSystem.readFile(this.path);
			}
		}
		return binaryData;
	}

	async *getReferencedAssetUuids() {
		await this.waitForInit();
		const usedAssetLoaderType = this.projectAssetTypeConstructor.usedAssetLoaderType;
		if (usedAssetLoaderType && usedAssetLoaderType.prototype instanceof AssetLoaderTypeGenericStructure) {
			const assetData = await this.readAssetData();

			const referencedUuids = [];
			BinaryComposer.objectToBinary(assetData, {
				...usedAssetLoaderType.binaryComposerOpts,
				transformValueHook: args => {
					let {value, type} = args;
					if (usedAssetLoaderType.binaryComposerOpts.transformValueHook) {
						value = usedAssetLoaderType.binaryComposerOpts.transformValueHook(args);
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
