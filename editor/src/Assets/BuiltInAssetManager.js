import {ProjectAsset} from "./ProjectAsset.js";
import {arrayBufferToBase64} from "../../../src/index.js";
import SingleInstancePromise from "../../../src/Util/SingleInstancePromise.js";
import editor from "../editorInstance.js";
import {IS_DEV_BUILD} from "../editorDefines.js";
import toFormattedJsonString from "../Util/toFormattedJsonString.js";
import {AssetManager} from "./AssetManager.js";

export class BuiltInAssetManager {
	constructor() {
		/** @type {Map<string, ProjectAsset>}*/
		this.assets = new Map();
		this.basePath = "../builtInAssets/";

		if (IS_DEV_BUILD) {
			this.onAssetChangeCbs = new Set();
		}

		this.loadAssetsInstance = new SingleInstancePromise(async () => {
			const response = await fetch(this.basePath + "assetSettings.json");
			const json = await response.json();
			const existingUuids = new Set(this.assets.keys());
			for (const [uuid, assetData] of Object.entries(json.assets)) {
				if (existingUuids.has(uuid)) {
					existingUuids.delete(uuid);
					continue;
				}
				assetData.isBuiltIn = true;
				const projectAsset = await ProjectAsset.fromJsonData(uuid, assetData);
				if (projectAsset) {
					projectAsset.onNewLiveAssetInstance(() => {
						for (const cb of this.onAssetChangeCbs) {
							cb(uuid);
						}
					});
					this.assets.set(uuid, projectAsset);
				}
			}
			for (const uuid of existingUuids) {
				const asset = this.assets.get(uuid);
				asset.destructor();
				this.assets.delete(uuid);
			}
		}, {run: true, once: false});
	}

	init() {
		if (IS_DEV_BUILD) {
			editor.devSocket.addListener("builtInAssetChange", data => {
				const asset = this.assets.get(data.uuid);
				if (asset) {
					asset.fileChangedExternally();
				}
			});
			editor.devSocket.addListener("builtInAssetListUpdate", () => {
				this.loadAssetsInstance.run(true);
			});
		}
	}

	async waitForLoad() {
		await this.loadAssetsInstance.waitForFinish();
	}

	get allowAssetEditing() {
		if (!IS_DEV_BUILD) return false;
		return editor.devSocket.connected;
	}

	async exists(path) {
		await this.waitForLoad();
		for (const asset of this.assets.values()) {
			if (AssetManager.testPathMatch(asset.path, path)) return true;
		}
		return false;
	}

	async fetchAsset(path, format = "json") {
		const response = await fetch(this.basePath + path.join("/"));
		if (format == "json") {
			return await response.json();
		} else if (format == "text") {
			return await response.text();
		} else if (format == "binary") {
			return await response.arrayBuffer();
		}
		return null;
	}

	onAssetChange(cb) {
		if (!IS_DEV_BUILD) return;
		this.onAssetChangeCbs.add(cb);
	}

	async writeJson(path, json) {
		if (!IS_DEV_BUILD) return;
		const jsonStr = toFormattedJsonString(json);
		await this.writeText(path, jsonStr);
	}

	async writeText(path, text) {
		if (!IS_DEV_BUILD) return;
		const encoder = new TextEncoder();
		const buffer = encoder.encode(text);
		await this.writeBinary(path, buffer.buffer);
	}

	async writeBinary(path, arrayBuffer) {
		if (!IS_DEV_BUILD) return;
		await editor.devSocket.sendRoundTripMessage("writeBuiltInAsset", {
			path,
			writeData: arrayBufferToBase64(arrayBuffer),
		});
	}
}
