import fsSync, {promises as fs} from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {sendAllConnections} from "./index.js";
import {base64ToArrayBuffer, generateUuid} from "./Util.js";
import toFormattedJsonString from "../src/Util/toFormattedJsonString.js";
import md5 from "js-md5";

export default class BuiltInAssetManager {
	constructor() {
		const dirname = path.dirname(fileURLToPath(import.meta.url));
		this.builtInAssetsPath = path.resolve(dirname, "../builtInAssets/");
		this.assetSettingsPath = path.resolve(this.builtInAssetsPath, "assetSettings.json");

		this.assetSettingsLoaded = false;
		this.assetSettings = new Map();
		this.fileHashes = new Map(); // <md5, uuid>
		this.assetSettingsJustSaved = false;
		this.loadAssetSettings();
		this.watch();
	}

	async loadAssetSettings() {
		const str = await fs.readFile(this.assetSettingsPath, {encoding: "utf8"});
		let data;
		try {
			data = JSON.parse(str);
		} catch (e) {
			console.error("[BuiltInAssetManager] parsing asset settings failed");
			return;
		}
		this.assetSettings.clear();
		this.fileHashes.clear();
		for (const [uuid, assetData] of Object.entries(data.assets)) {
			this.assetSettings.set(uuid, assetData);
			if (assetData.path) {
				const fullPath = path.resolve(this.builtInAssetsPath, ...assetData.path);
				(async () => {
					const fileBuffer = await fs.readFile(fullPath);
					const hash = md5(fileBuffer);
					this.fileHashes.set(hash, uuid);
				})();
			}
		}
		console.log("[BuiltInAssetManager] Asset settings loaded");
		this.assetSettingsLoaded = true;
	}

	watch() {
		console.log("[BuiltInAssetManager] watching for file changes in " + this.builtInAssetsPath);
		fsSync.watch(this.builtInAssetsPath, {recursive: true}, (eventType, relPath) => {
			if (relPath == "assetSettings.json") {
				if (this.assetSettingsJustSaved) {
					this.assetSettingsJustSaved = false;
				} else {
					console.log("[BuiltInAssetManager] External assetSettings.json change, reloading asset settings...");
					this.loadAssetSettings();
				}
				return;
			}
			if (!this.assetSettingsLoaded) return;

			this.handleFileChange(relPath);
		});
	}

	async handleFileChange(relPath) {
		const filename = path.basename(relPath);
		if (filename.startsWith(".")) return;
		const fullPath = path.resolve(this.builtInAssetsPath, relPath);
		let stat = null;
		try {
			stat = await fs.stat(fullPath);
		} catch (e) {
			stat = null;
		}
		if (stat && stat.isDirectory()) {
			const entries = await fs.readdir(fullPath);
			for (const entry of entries) {
				await this.handleFileChange(path.join(relPath, entry));
			}
			return;
		}

		let newHash = null;
		if (stat) {
			const fileBuffer = await fs.readFile(fullPath);
			newHash = md5(fileBuffer);
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
		if (!stat) {
			if (this.deleteAssetSettings(pathArr)) {
				assetSettingsNeedsUpdate = true;
			}
		} else if (!uuid) {
			if (this.fileHashes.has(newHash)) {
				uuid = this.fileHashes.get(newHash);
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
			sendAllConnections("builtInAssetChange", {
				uuid,
			});
		}
	}

	async saveAssetSettings(notifySocket = true) {
		if (!this.assetSettingsLoaded) return;
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
		this.assetSettingsJustSaved = true;
		await fs.writeFile(this.assetSettingsPath, str);

		if (notifySocket) {
			sendAllConnections("builtInAssetListUpdate");
		}
	}

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

	createAssetSettings(path) {
		const uuid = generateUuid();
		this.assetSettings.set(uuid, {path});
		return uuid;
	}

	async writeAssetData(pathArr, base64Data, responsecb) {
		const fullPath = path.resolve(this.builtInAssetsPath, ...pathArr);
		const buffer = base64ToArrayBuffer(base64Data);
		let success = false;
		try {
			await fs.writeFile(fullPath, new Uint8Array(buffer));
			success = true;
		} catch (e) {
			console.error(e);
		}
		responsecb(success);
	}

	testPathStartsWith(path, startsWithPath) {
		if (path.length < startsWithPath.length) return false;
		for (const [i, name] of startsWithPath.entries()) {
			if (path[i] != name) return false;
		}
		return true;
	}

	getAssetSettingsUuidForPath(path) {
		for (const [uuid, assetSettings] of this.assetSettings) {
			if (this.testPathMatch(path, assetSettings.path)) {
				return uuid;
			}
		}
		return null;
	}

	testPathMatch(path1 = [], path2 = []) {
		if (path1.length != path2.length) return false;
		for (let i = 0; i < path1.length; i++) {
			if (path1[i] != path2[i]) return false;
		}
		return true;
	}
}
