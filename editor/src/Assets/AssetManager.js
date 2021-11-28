import {SingleInstancePromise} from "../../../src/index.js";
import editor from "../editorInstance.js";
import {generateUuid, handleDuplicateName} from "../Util/Util.js";
import DefaultAssetLink from "./DefaultAssetLink.js";
import ProjectAsset from "./ProjectAsset.js";

export class AssetManager {
	constructor() {
		/** @type {Map<string, ProjectAsset>}*/
		this.projectAssets = new Map();
		/** @type {Map<string, DefaultAssetLink>}*/
		this.defaultAssetLinks = new Map();

		this.assetSettingsPath = ["ProjectSettings", "assetSettings.json"];

		this.assetSettingsLoaded = false;
		this.waitForAssetSettingsLoadCbs = new Set();

		this.boundExternalChange = this.externalChange.bind(this);
		editor.projectManager.onExternalChange(this.boundExternalChange);

		this.loadAssetSettingsFromUserGesture = false;
		this.loadAssetSettingsInstance = new SingleInstancePromise(async () => {
			await this.loadAssetSettingsInstanceFn();
		}, {
			once: false,
			run: true,
		});
	}

	destructor() {
		editor.projectManager.removeOnExternalChange(this.boundExternalChange);
		this.boundExternalChange = null;
	}

	get fileSystem() {
		return editor.projectManager.currentProjectFileSystem;
	}

	get builtInAssets() {
		return editor.builtInAssetManager.assets;
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

		for (const builtInAssetLink of editor.builtInDefaultAssetLinksManager.registeredAssetLinks) {
			const defaultAssetLink = new DefaultAssetLink(builtInAssetLink);
			defaultAssetLink.setBuiltIn(true, builtInAssetLink.originalAssetUuid);
			this.defaultAssetLinks.set(builtInAssetLink.defaultAssetUuid, defaultAssetLink);
		}

		if (await this.fileSystem.isFile(this.assetSettingsPath)) {
			const json = await this.fileSystem.readJson(this.assetSettingsPath);
			if (json) {
				for (const [uuid, assetData] of Object.entries(json.assets)) {
					const projectAsset = await ProjectAsset.fromJsonData(uuid, assetData);
					if (projectAsset) {
						projectAsset.makeUuidConsistent();
						this.projectAssets.set(uuid, projectAsset);
					}
				}

				if (json.defaultAssetLinks) {
					for (const [defaultAssetUuid, defaultAssetData] of Object.entries(json.defaultAssetLinks)) {
						const existingDefaultAssetLink = this.getDefaultAssetLink(defaultAssetUuid);
						if (existingDefaultAssetLink) {
							existingDefaultAssetLink.setUserData(defaultAssetData);
						} else {
							const defaultAssetLink = new DefaultAssetLink({defaultAssetUuid, ...defaultAssetData});
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
		const assetSettings = {};
		const assets = {};
		assetSettings.assets = assets;
		for (const [uuid, projectAsset] of this.projectAssets) {
			if (projectAsset.needsAssetSettingsSave) {
				assets[uuid] = projectAsset.toJson();
			}
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

	async createNewAsset(parentPath, assetType) {
		const type = editor.projectAssetTypeManager.getAssetType(assetType);
		let fileName = type.newFileName + "." + type.newFileExtension;

		if (this.fileSystem.exists([...parentPath, fileName])) {
			const existingFiles = await this.fileSystem.readDir(parentPath);
			fileName = handleDuplicateName(existingFiles, type.newFileName, "." + type.newFileExtension);
		}
		const newPath = [...parentPath, fileName];

		const projectAsset = await this.registerAsset(newPath, assetType);
		await projectAsset.createNewLiveAssetData();
	}

	async deleteAsset(path) {
		await this.fileSystem.delete(path, true);
	}

	async registerAsset(path, assetType = null, forceAssetType = false) {
		await this.loadAssetSettings(true);
		const uuid = generateUuid();
		const projectAsset = new ProjectAsset({uuid, path, assetType, forceAssetType});
		await projectAsset.waitForInit();
		this.projectAssets.set(uuid, projectAsset);
		if (projectAsset.needsAssetSettingsSave) {
			this.saveAssetSettings();
		}
		return projectAsset;
	}

	async makeAssetUuidConsistent(asset) {
		if (!asset || asset.needsConsistentUuid || asset.isBuiltIn) return;
		asset.makeUuidConsistent();
		await this.saveAssetSettings();
	}

	async externalChange(e) {
		const projectAsset = await this.getProjectAssetFromPath(e.path, this.assetSettingsLoaded);
		if (projectAsset) {
			const guessedType = await ProjectAsset.guessAssetTypeFromFile(e.path);
			if (guessedType != projectAsset.assetType) {
				// todo
				console.warn("not yet implemented: changing assetType");
			} else {
				await projectAsset.fileChangedExternally();
			}
		}
	}

	setDefaultAssetLinks(builtInDefaultAssetLinks, defaultAssetLinks) {
		const unsetAssetLinkUuids = new Set(this.defaultAssetLinks.keys());
		for (const {defaultAssetUuid, originalAssetUuid} of builtInDefaultAssetLinks) {
			const existingDefaultAssetLink = this.getDefaultAssetLink(defaultAssetUuid);
			if (existingDefaultAssetLink) {
				existingDefaultAssetLink.setUserData({name: "", originalAssetUuid});
			} else {
				this.defaultAssetLinks.set(defaultAssetUuid, new DefaultAssetLink({defaultAssetUuid, originalAssetUuid}));
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
	 * @param {string} defaultAssetUuid
	 * @returns {DefaultAssetLink}
	 */
	getDefaultAssetLink(defaultAssetUuid) {
		return this.defaultAssetLinks.get(defaultAssetUuid);
	}

	resolveDefaultAssetLinkUuid(uuid) {
		const defaultAssetLink = this.getDefaultAssetLink(uuid);
		if (defaultAssetLink) {
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
	 * @param {string} uuid
	 * @returns {Promise<ProjectAsset>}
	 */
	async getProjectAsset(uuid) {
		await this.loadAssetSettings(true);
		return this.getProjectAssetImmediate(uuid);
	}

	getProjectAssetImmediate(uuid) {
		if (!this.assetSettingsLoaded) return null;

		uuid = this.resolveDefaultAssetLinkUuid(uuid);
		return this.projectAssets.get(uuid) || this.builtInAssets.get(uuid);
	}

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

	async assetMoved(fromPath = [], toPath = []) {
		const asset = await this.getProjectAssetFromPath(fromPath);
		if (!asset) return;
		asset.assetMoved(toPath);
		await this.saveAssetSettings();
	}

	async getAssetSettings(path = []) {
		await this.loadAssetSettings(true);
	}

	setAssetSettings(path = [], settings = {}) {

	}

	/**
	 * @param {import("../Util/Util.js").UuidString} uuid
	 */
	async getLiveAsset(uuid) {
		const projectAsset = await this.getProjectAsset(uuid);
		if (!projectAsset) return null;

		return await projectAsset.getLiveAsset();
	}

	/**
	 * @param {import("../Util/Util.js").UuidString} uuid
	 * @param {import("./LiveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 */
	async getLiveAssetData(uuid, recursionTracker = null) {
		const projectAsset = await this.getProjectAsset(uuid);
		if (!projectAsset) return null;

		return await projectAsset.getLiveAssetData(recursionTracker);
	}

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
		return null;
	}

	getAssetUuidFromLiveAsset(liveAsset) {
		const projectAsset = this.getProjectAssetForLiveAsset(liveAsset);
		if (projectAsset) {
			return projectAsset.uuid;
		}
		return null;
	}
}
