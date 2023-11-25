import {TypedMessenger} from "../../../../src/util/TypedMessenger/TypedMessenger.js";
import {createTreeViewStructure} from "../../ui/propertiesTreeView/createStructureHelpers.js";
import {Task} from "./Task.js";

/**
 * @typedef TaskBundleAssetsConfig
 * @property {import("../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} [outputPath]
 * @property {TaskBundleAssetsConfigAssetItem[]} [assets]
 * @property {import("../../../../src/mod.js").UuidString[]} [excludeAssets]
 * @property {import("../../../../src/mod.js").UuidString[]} [excludeAssetsRecursive]
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
			if (!asset) return null;

			const assetTypeUuid = await asset.getAssetTypeUuid();
			// TODO: Ideally assets without an asset type are filtered out before the initial message is sent to the worker.
			if (!assetTypeUuid) throw new Error(`Failed to bundle asset data, the asset with uuid ${assetUuid} has no asset type.`);

			const assetData = await asset.getBundledAssetData();
			const bufferOrString = await bundledAssetDataToArrayBufferOrString(assetData);

			/** @type {Transferable[]} */
			let transfer = [];
			if (typeof bufferOrString != "string") {
				transfer = [bufferOrString];
			}

			/** @satisfies {import("../../../../src/mod.js").TypedMessengerRequestHandlerReturn} */
			const result = {
				$respondOptions: {
					returnValue: {
						assetTypeUuid,
						assetData: bufferOrString,
					},
					transfer,
				},
			};
			return result;
		},
	};
}

/**
 * Turns the return value of `ProjectAsset.getBundledAssetData` into an ArrayBuffer or string.
 * This also slices the buffer if it is a view.
 * You can use this to directly pass the result as an argument when writing to a file.
 * @param {import("../../assets/ProjectAsset.js").GetBundledAssetDataReturnType} bundledAssetData
 */
export async function bundledAssetDataToArrayBufferOrString(bundledAssetData) {
	if (!bundledAssetData) return "";

	if (bundledAssetData instanceof Blob) {
		return await bundledAssetData.arrayBuffer();
	} else if (ArrayBuffer.isView(bundledAssetData)) {
		return bundledAssetData.buffer.slice(bundledAssetData.byteOffset, bundledAssetData.byteOffset + bundledAssetData.byteLength);
	}
	return bundledAssetData;
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

	/** @type {TypedMessenger<BundleAssetsMessengerResponseHandlers, import("../workers/bundleAssets/mod.js").BundleAssetsMessengerResponseHandlers>} */
	#messenger;

	#lastFileStreamId = 0;
	/** @type {Map<number, FileSystemWritableFileStream>} */
	#fileStreams = new Map();

	/**
	 * @param  {ConstructorParameters<typeof Task>} args
	 */
	constructor(...args) {
		super(...args);

		this.#messenger = new TypedMessenger();
		const assetManager = this.studioInstance.projectManager.assetManager;
		if (!assetManager) {
			throw new Error("Failed to create Bundle Scripts task: no asset manager.");
		}
		this.#messenger.initializeWorker(this.worker, getResponseHandlers(assetManager, this.#fileStreams));
	}

	/**
	 * @param {import("./Task.js").RunTaskOptions<TaskBundleAssetsConfig>} config
	 */
	async runTask({config, allowDiskWrites}) {
		if (!config) {
			throw new Error("Failed to run task: no config provided");
		}
		const fileSystem = this.studioInstance.projectManager.currentProjectFileSystem;
		if (!fileSystem) {
			throw new Error("Failed to run task: no project file system.");
		}
		const assetManager = this.studioInstance.projectManager.assetManager;
		if (!assetManager) {
			throw new Error("Failed to run task: no asset manager.");
		}
		if (!config.assets) {
			throw new Error("Failed to bundle assets: no assets provided.");
		}
		if (!config.outputPath) {
			throw new Error("Failed to bundle assets: no output path provided.");
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

		let fileStreamId = -1;
		if (allowDiskWrites) {
			const bundleFileStream = await fileSystem.writeFileStream(config.outputPath);
			if (bundleFileStream.locked) {
				throw new Error("Failed to write bundle, file is locked.");
			}

			fileStreamId = this.#lastFileStreamId++;
			this.#fileStreams.set(fileStreamId, bundleFileStream);
		}

		const bundle = await this.#messenger.send.bundle(Array.from(assetUuids), fileStreamId);

		/** @type {import("./Task.js").RunTaskReturn} */
		const result = {};
		if (allowDiskWrites) {
			this.#fileStreams.delete(fileStreamId);
			result.touchedPaths = [config.outputPath];
		} else {
			if (!bundle) {
				throw new Error("Assertion failed, bundle is null");
			}
			/** @type {import("./Task.js").RunTaskCreateAssetData[]} */
			result.writeAssets = [
				{
					fileData: bundle,
					path: config.outputPath,
				},
			];
		}

		return result;
	}
}
