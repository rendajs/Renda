import {base64ToArrayBuffer, generateUuid} from "../../../src/util/mod.js";
import {hashBuffer} from "../../../src/mod.js";
import {toFormattedJsonString} from "../../../src/util/toFormattedJsonString.js";
import {basename, dirname, fromFileUrl, join, relative, resolve} from "std/path";
import {SingleInstancePromise} from "../../../src/util/SingleInstancePromise.js";

export class BuiltInAssetManager {
	/** @type {Deno.FsWatcher?} */
	#fileWatcher = null;

	/**
	 * @param {Object} options
	 * @param {string?} options.builtInAssetsPath
	 * @param {boolean} [options.verbose]
	 */
	constructor({
		builtInAssetsPath = null,
		verbose = false,
	}) {
		const scriptDir = dirname(fromFileUrl(import.meta.url));
		if (builtInAssetsPath == null) {
			this.builtInAssetsPath = resolve(scriptDir, "../../builtInAssets/");
		} else {
			this.builtInAssetsPath = builtInAssetsPath;
		}
		this.assetSettingsPath = resolve(this.builtInAssetsPath, "assetSettings.json");

		this.verbose = verbose;

		/** @private */
		this.loadAssetSettingsInstance = new SingleInstancePromise(async () => {
			await this.loadAssetSettingsFn();
		}, {
			run: false,
			once: false,
		});
		this.assetSettingsLoaded = false;
		/** @type {Map<import("../../../src/util/mod.js").UuidString, any>}*/
		this.assetSettings = new Map();
		/** @type {Map<string, import("../../../src/util/mod.js").UuidString>} */
		this.fileHashes = new Map(); // <md5, uuid>
		/**
		 * Time in millisecond when the asset settings file was changed on disk
		 * by this application. This is used to ignore watch events that are
		 * triggered by the application itself.
		 */
		this.lastAssetSettingsSaveTime = -Infinity;
		/** @type {Set<(op: string, data: any) => any>} */
		this.onWebsocketBroadcastNeededCbs = new Set();

		/**
		 * Used in unit tests for waiting until all promises are resolved.
		 * @private
		 * @type {Set<Promise<void>>}
		 */
		this.handleFileChangePromises = new Set();
	}

	async loadAssetSettings() {
		await this.loadAssetSettingsInstance.run();
	}

	async waitForAssetSettingsLoad() {
		await this.loadAssetSettingsInstance.waitForFinishIfRunning();
	}

	async loadAssetSettingsFn() {
		const str = await Deno.readTextFile(this.assetSettingsPath);
		let data;
		try {
			data = JSON.parse(str);
		} catch {
			console.error("[BuiltInAssetManager] parsing asset settings failed");
			return;
		}
		this.assetSettings.clear();
		this.fileHashes.clear();
		/** @type {Promise<void>[]} */
		const promises = [];
		for (const [uuid, assetData] of Object.entries(data.assets)) {
			this.assetSettings.set(uuid, assetData);
			if (assetData.path) {
				const fullPath = resolve(this.builtInAssetsPath, ...assetData.path);
				const promise = (async () => {
					const fileBuffer = await Deno.readFile(fullPath);
					this.fileHashes.set(await hashBuffer(fileBuffer), uuid);
				})();
				promises.push(promise);
			}
		}
		await Promise.all(promises);

		this.assetSettingsLoaded = true;
	}

	async watch() {
		if (this.#fileWatcher) {
			return;
		}
		this.#fileWatcher = Deno.watchFs(this.builtInAssetsPath);
		for await (const event of this.#fileWatcher) {
			const relPath = relative(this.builtInAssetsPath, event.paths[0]);
			if (relPath == "assetSettings.json") {
				if (Date.now() - this.lastAssetSettingsSaveTime > 1000) {
					if (this.verbose) console.log("[BuiltInAssetManager] External assetSettings.json change, reloading asset settings...");
					this.loadAssetSettings();
				}
			} else {
				if (this.assetSettingsLoaded) {
					(async () => {
						const promise = this.handleFileChange(relPath);
						this.handleFileChangePromises.add(promise);
						await promise;
						this.handleFileChangePromises.delete(promise);
					})();
				}
			}
		}
	}

	stopWatching() {
		if (this.#fileWatcher) {
			this.#fileWatcher.close();
			this.#fileWatcher = null;
		}
	}

	/**
	 * @param {string} relPath
	 */
	async handleFileChange(relPath) {
		const filename = basename(relPath);
		if (filename.startsWith(".")) return;
		const fullPath = resolve(this.builtInAssetsPath, relPath);
		let stat = null;
		try {
			stat = await Deno.stat(fullPath);
		} catch (e) {
			stat = null;
		}
		if (stat && stat.isDirectory) {
			const entries = Deno.readDir(fullPath);
			for await (const entry of entries) {
				await this.handleFileChange(join(relPath, entry.name));
			}
			return;
		}

		let newHash = null;
		if (stat) {
			const fileBuffer = await Deno.readFile(fullPath);
			newHash = await hashBuffer(fileBuffer);
		}

		const pathArr = relPath.split("/");
		let assetSettingsNeedsUpdate = false;
		let uuid = this.getAssetSettingsUuidForPath(pathArr);
		if (newHash && uuid) {
			for (const [oldHash, hashUuid] of this.fileHashes) {
				if (hashUuid == uuid && newHash != oldHash && !this.fileHashes.has(newHash)) {
					this.fileHashes.delete(oldHash);
					this.fileHashes.set(newHash, uuid);
				}
			}
		}
		if (!stat || !newHash) {
			if (this.deleteAssetSettings(pathArr)) {
				assetSettingsNeedsUpdate = true;
			}
		} else if (!uuid) {
			const fileUuid = this.fileHashes.get(newHash);
			if (fileUuid) {
				uuid = fileUuid;
				const assetSettings = this.assetSettings.get(uuid);
				if (assetSettings) {
					assetSettings.path = pathArr;
				} else {
					this.assetSettings.set(uuid, {path: pathArr});
				}
			} else {
				uuid = this.createAssetSettings(pathArr);
				if (newHash) this.fileHashes.set(newHash, uuid);
			}
			assetSettingsNeedsUpdate = true;
		}

		if (assetSettingsNeedsUpdate) {
			this.saveAssetSettings();
		}

		if (!uuid) {
			uuid = this.getAssetSettingsUuidForPath(pathArr);
		}

		if (uuid) {
			this.sendAllConnections("builtInAssetChange", {
				uuid,
			});
		}
	}

	/**
	 * Used in unit tests to wait for tests to finish before making assertions.
	 */
	async waitForHandleFileChangePromises() {
		while (this.handleFileChangePromises.size > 0) {
			await Promise.race(this.handleFileChangePromises);
		}
	}

	async saveAssetSettings(notifySocket = true) {
		if (!this.assetSettingsLoaded) return;
		/** @type {Object.<import("../../../src/util/mod.js").UuidString, any>} */
		const assets = {};
		const uuidPaths = new Map();
		for (const [uuid, assetSettings] of this.assetSettings) {
			uuidPaths.set(uuid, assetSettings.path);
		}
		const sortedUuidSettings = [];
		for (const [uuid, path] of uuidPaths) {
			sortedUuidSettings.push({uuid, path});
		}
		sortedUuidSettings.sort((a, b) => {
			if (a.path && b.path) {
				if (a.path.length != b.path.length) {
					return a.path.length - b.path.length;
				}
				const joinedA = a.path.join("/");
				const joinedB = b.path.join("/");
				if (joinedA < joinedB) {
					return -1;
				}
				if (joinedA > joinedB) {
					return 1;
				}
			}
			if (a.uuid < b.uuid) {
				return -1;
			}
			if (a.uuid > b.uuid) {
				return 1;
			}
			return 0;
		});
		const sortedUuids = sortedUuidSettings.map(x => x.uuid);
		for (const uuid of sortedUuids) {
			if (this.assetSettings.has(uuid)) {
				assets[uuid] = this.assetSettings.get(uuid);
			}
		}
		for (const [uuid, assetSettings] of this.assetSettings) {
			if (assets[uuid]) continue;
			assets[uuid] = assetSettings;
		}
		const json = {assets};
		const str = toFormattedJsonString(json, {maxArrayStringItemLength: -1});
		this.lastAssetSettingsSaveTime = Date.now();
		await Deno.writeTextFile(this.assetSettingsPath, str);

		if (notifySocket) {
			this.sendAllConnections("builtInAssetListUpdate");
		}
	}

	/**
	 * @param {string[]} path
	 */
	deleteAssetSettings(path) {
		if (!this.assetSettingsLoaded) return false;
		let assetSettingsNeedsUpdate = false;
		for (const [uuid, assetSettings] of this.assetSettings) {
			if (this.testPathStartsWith(assetSettings.path, path)) {
				this.assetSettings.delete(uuid);
				assetSettingsNeedsUpdate = true;
			}
		}
		return assetSettingsNeedsUpdate;
	}

	/**
	 * @param {string[]} path
	 */
	createAssetSettings(path) {
		const uuid = generateUuid();
		this.assetSettings.set(uuid, {path});
		return uuid;
	}

	/**
	 * @param {string[]} path
	 * @param {string} base64Data
	 */
	async writeAssetData(path, base64Data) {
		const fullPath = resolve(this.builtInAssetsPath, ...path);
		const buffer = base64ToArrayBuffer(base64Data);
		let success = false;
		try {
			await Deno.writeFile(fullPath, new Uint8Array(buffer));
			success = true;
		} catch (e) {
			console.error(e);
		}
		return success;
	}

	/**
	 * @param {string[]} path
	 * @param {string[]} startsWithPath
	 */
	testPathStartsWith(path, startsWithPath) {
		if (path.length < startsWithPath.length) return false;
		for (const [i, name] of startsWithPath.entries()) {
			if (path[i] != name) return false;
		}
		return true;
	}

	/**
	 * @param {string[]} path
	 */
	getAssetSettingsUuidForPath(path) {
		for (const [uuid, assetSettings] of this.assetSettings) {
			if (this.testPathMatch(path, assetSettings.path)) {
				return uuid;
			}
		}
		return null;
	}

	/**
	 * @param {string[]} path1
	 * @param {string[]} path2
	 */
	testPathMatch(path1 = [], path2 = []) {
		if (path1.length != path2.length) return false;
		for (let i = 0; i < path1.length; i++) {
			if (path1[i] != path2[i]) return false;
		}
		return true;
	}

	/**
	 * @param {string} op
	 * @param {any} data
	 */
	sendAllConnections(op, data = null) {
		this.onWebsocketBroadcastNeededCbs.forEach(cb => cb(op, data));
	}

	/**
	 * This callback is fired when the built-in asset manager wishes
	 * to send a message to all connected clients.
	 * @param {(op: string, data: any) => any} cb
	 */
	onWebsocketBroadcastNeeded(cb) {
		this.onWebsocketBroadcastNeededCbs.add(cb);
	}
}
