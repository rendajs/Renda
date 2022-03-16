import {ProjectAsset} from "./ProjectAsset.js";
import {arrayBufferToBase64, toFormattedJsonString} from "../../../src/mod.js";
import {SingleInstancePromise} from "../../../src/util/SingleInstancePromise.js";
import {IS_DEV_BUILD} from "../editorDefines.js";
import {AssetManager} from "./AssetManager.js";
import {getEditorInstance} from "../editorInstance.js";

/**
 * @typedef {(uuid: import("../../../src/mod.js").UuidString) => any} BuiltInAssetChangeCallback
 */

/**
 * This class handles the loading of built-in assets.
 * Built-in assets work very similar to regular assets, but they can't be edited
 * in the editor.
 * To make development easier however, built-in assets are still editable in
 * development builds of the editor. This is achieved by connecting to the
 * devsocket. When an asset is changed from the editor, a message is sent to the
 * devsocket which saves the file in the editor/builtInAssets folder.
 * Assets loaded from within the engine will be reloaded if they use
 * `EngineAssetsManager.watchAsset()`.
 *
 * This setup allows for using assets such as shaders and textures for the
 * renderer for instance.
 */
export class BuiltInAssetManager {
	/**
	 * @param {import("./ProjectAssetTypeManager.js").ProjectAssetTypeManager} projectAssetTypeManager
	 */
	constructor(projectAssetTypeManager) {
		/** @type {Map<import("../../../src/mod.js").UuidString, import("./ProjectAsset.js").ProjectAssetAny>}*/
		this.assets = new Map();
		this.basePath = "../builtInAssets/";

		this.devSocket = null;

		if (IS_DEV_BUILD) {
			/** @type {Set<BuiltInAssetChangeCallback>} */
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
				const assetManager = await getEditorInstance().projectManager.getAssetManager();
				const projectAsset = await ProjectAsset.guessAssetTypeAndCreate(assetManager, projectAssetTypeManager, this, null, {uuid, ...assetData});
				if (projectAsset) {
					projectAsset.onLiveAssetNeedsReplacement(() => {
						if (!this.onAssetChangeCbs) return;
						for (const cb of this.onAssetChangeCbs) {
							cb(uuid);
						}
					});
					this.assets.set(uuid, projectAsset);
				}
			}
			for (const uuid of existingUuids) {
				const asset = this.assets.get(uuid);
				asset?.destructor();
				this.assets.delete(uuid);
			}
		}, {run: true, once: false});
	}

	/**
	 * @param {import("../network/DevSocketManager.js").DevSocketManager} devSocket
	 */
	init(devSocket) {
		if (IS_DEV_BUILD) {
			this.devSocket = devSocket;
			devSocket.addListener("builtInAssetChange", data => {
				const asset = this.assets.get(data.uuid);
				if (asset) {
					asset.fileChangedExternally();
				}
			});
			devSocket.addListener("builtInAssetListUpdate", () => {
				this.loadAssetsInstance.run(true);
			});
		}
	}

	async waitForLoad() {
		await this.loadAssetsInstance.waitForFinish();
	}

	get allowAssetEditing() {
		if (!IS_DEV_BUILD || !this.devSocket) return false;
		return this.devSocket.connected;
	}

	/**
	 * @param {string[]} path
	 */
	async exists(path) {
		await this.waitForLoad();
		for (const asset of this.assets.values()) {
			if (AssetManager.testPathMatch(asset.path, path)) return true;
		}
		return false;
	}

	/**
	 * Fetches an asset from the built-in assets directory.
	 * This uses a regular fetch rather than the devsocket. That way, if the
	 * devsocket isn't running for whatever reason, built-in assets can still be used.
	 * @param {string[]} path
	 * @param {"json" | "text" | "binary"} format
	 */
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

	/**
	 * @param {BuiltInAssetChangeCallback} cb
	 */
	onAssetChange(cb) {
		if (!IS_DEV_BUILD) return;
		this.onAssetChangeCbs.add(cb);
	}

	assertDevBuildBeforeWrite() {
		if (!IS_DEV_BUILD) {
			throw new Error("Writing built-in assets is only supported in development builds.");
		}
	}

	/**
	 * @param {string[]} path
	 * @param {any} json
	 */
	async writeJson(path, json) {
		this.assertDevBuildBeforeWrite();
		const jsonStr = toFormattedJsonString(json);
		await this.writeText(path, jsonStr);
	}

	/**
	 * @param {string[]} path
	 * @param {string} text
	 */
	async writeText(path, text) {
		this.assertDevBuildBeforeWrite();
		const encoder = new TextEncoder();
		const buffer = encoder.encode(text);
		await this.writeBinary(path, buffer.buffer);
	}

	/**
	 * @param {string[]} path
	 * @param {ArrayBufferLike} arrayBuffer
	 */
	async writeBinary(path, arrayBuffer) {
		this.assertDevBuildBeforeWrite();
		if (!this.devSocket) return;
		await this.devSocket.sendRoundTripMessage("writeBuiltInAsset", {
			path,
			writeData: arrayBufferToBase64(arrayBuffer),
		});
	}
}
