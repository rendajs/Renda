import {TypedMessenger} from "../../../../src/util/TypedMessenger.js";
import {createTreeViewStructure} from "../../ui/propertiesTreeView/createStructureHelpers.js";
import {Task} from "./Task.js";

/**
 * @typedef TaskBundleAssetsConfig
 * @property {import("../../util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} outputPath
 * @property {TaskBundleAssetsConfigAssetItem[]} assets
 * @property {import("../../../../src/mod.js").UuidString[]} excludeAssets
 * @property {import("../../../../src/mod.js").UuidString[]} excludeAssetsRecursive
 */

/**
 * @typedef TaskBundleAssetsConfigAssetItem
 * @property {import("../../../../src/mod.js").UuidString} asset
 * @property {boolean} includeChildren
 */

/**
 * Generates response handlers for requests going from the worker to the main thread.
 * @param {import("../../assets/AssetManager.js").AssetManager} assetManager
 * @param {Map<number, FileSystemWritableFileStream>} fileStreams
 */
function getResponseHandlers(assetManager, fileStreams) {
	return {
		/**
		 * @param {number} fileStreamId
		 * @param {FileSystemWriteChunkType} writeData
		 */
		async writeFile(fileStreamId, writeData) {
			const fileStream = fileStreams.get(fileStreamId);
			if (!fileStream) throw new Error(`File stream with id ${fileStreamId} not found.`);
			await fileStream.write(writeData);
		},
		/**
		 * @param {number} fileStreamId
		 */
		async closeFile(fileStreamId) {
			const fileStream = fileStreams.get(fileStreamId);
			if (!fileStream) throw new Error(`File stream with id ${fileStreamId} not found.`);
			await fileStream.close();
		},
		/**
		 * @param {import("../../../../src/mod.js").UuidString} assetUuid
		 */
		async getBundledAssetData(assetUuid) {
			const asset = await assetManager.getProjectAssetFromUuid(assetUuid);
			if (!asset) return {returnValue: null};

			const assetTypeUuid = await asset.getAssetTypeUuid();
			// TODO: Ideally assets without an asset type are filtered out before the initial message is sent to the worker.
			if (!assetTypeUuid) throw new Error(`Failed to bundle asset data, the asset with uuid ${assetUuid} has no asset type.`);

			let assetData = await asset.getBundledAssetData();
			if (!assetData) assetData = "";

			if (assetData instanceof Blob) {
				assetData = await assetData.arrayBuffer();
			} else if (ArrayBuffer.isView(assetData)) {
				assetData = assetData.buffer.slice(assetData.byteOffset, assetData.byteOffset + assetData.byteLength);
			}

			/** @type {Transferable[]} */
			let transfer = [];
			if (typeof assetData != "string") {
				transfer = [assetData];
			}

			return {
				returnValue: {
					assetTypeUuid, assetData,
				},
				transfer,
			};
		},
	};
}

/**
 * @typedef {ReturnType<typeof getResponseHandlers>} BundleAssetsMessengerResponseHandlers
 */

/**
 * @extends {Task<TaskBundleAssetsConfig>}
 */
export class TaskBundleAssets extends Task {
	static uiName = "Bundle Assets";
	static type = "renda:bundleAssets";

	// @rollup-plugin-resolve-url-objects
	static workerUrl = new URL("../workers/bundleAssets/mod.js", import.meta.url);

	static configStructure = createTreeViewStructure({
		outputPath: {
			type: "array",
			guiOpts: {
				arrayType: "string",
			},
		},
		assets: {
			type: "array",
			guiOpts: {
				arrayType: "object",
				arrayGuiOpts: {
					structure: {
						asset: {
							type: "droppable",
						},
						includeChildren: {
							type: "boolean",
							guiOpts: {
								defaultValue: true,
							},
						},
					},
				},
			},
		},
		excludeAssets: {
			type: "array",
			guiOpts: {
				arrayType: "droppable",
			},
		},
		excludeAssetsRecursive: {
			type: "array",
			guiOpts: {
				arrayType: "droppable",
			},
		},
	});

	/** @type {TypedMessenger<import("../workers/bundleAssets/mod.js").BundleAssetsMessengerResponseHandlers, BundleAssetsMessengerResponseHandlers, true>} */
	#messenger;

	#lastFileStreamId = 0;
	/** @type {Map<number, FileSystemWritableFileStream>} */
	#fileStreams = new Map();

	/**
	 * @param  {ConstructorParameters<typeof Task>} args
	 */
	constructor(...args) {
		super(...args);

		this.#messenger = new TypedMessenger({transferSupport: true});
		this.#messenger.setSendHandler(data => {
			this.worker.postMessage(data.sendData, data.transfer);
		});
		this.worker.addEventListener("message", event => {
			this.#messenger.handleReceivedMessage(event.data);
		});
		const assetManager = this.editorInstance.projectManager.assetManager;
		if (!assetManager) {
			throw new Error("Failed to create Bundle Scripts task: no asset manager.");
		}
		this.#messenger.setResponseHandlers(getResponseHandlers(assetManager, this.#fileStreams));
	}

	/**
	 * @param {TaskBundleAssetsConfig} config
	 */
	async runTask(config) {
		const fileSystem = this.editorInstance.projectManager.currentProjectFileSystem;
		if (!fileSystem) {
			throw new Error("Failed to create Bundle Scripts task: no project file system.");
		}
		const assetManager = this.editorInstance.projectManager.assetManager;
		if (!assetManager) {
			throw new Error("Failed to run task: no asset manager.");
		}

		/** @type {Set<import("../../../../src/mod.js").UuidString>} */
		const assetUuids = new Set();
		const recursiveAssetUuids = [];
		for (const asset of config.assets) {
			if (asset.includeChildren) {
				recursiveAssetUuids.push(asset.asset);
			} else {
				assetUuids.add(asset.asset);
			}
		}
		const iterator = assetManager.collectAllAssetReferences(recursiveAssetUuids, {
			excludeUuids: new Set(config.excludeAssets),
			excludeUuidsRecursive: new Set(config.excludeAssetsRecursive),
		});
		for await (const uuid of iterator) {
			assetUuids.add(uuid);
		}

		const bundleFileStream = await fileSystem.writeFileStream(config.outputPath);
		if (bundleFileStream.locked) {
			throw new Error("Failed to write bundle, file is locked.");
		}

		const fileStreamId = this.#lastFileStreamId++;
		this.#fileStreams.set(fileStreamId, bundleFileStream);

		await this.#messenger.send("bundle", Array.from(assetUuids), fileStreamId);
	}
}
