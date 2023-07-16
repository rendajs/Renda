import {TypedMessenger} from "../../../../src/util/TypedMessenger.js";
import {ProjectAssetTypeJavascript} from "../../assets/projectAssetType/ProjectAssetTypeJavascript.js";
import {createTreeViewStructure} from "../../ui/propertiesTreeView/createStructureHelpers.js";
import {Task} from "./Task.js";

/**
 * @typedef TaskBundleScriptsConfig
 * @property {import("../../../../src/mod.js").UuidString[]} [entryPoints]
 * @property {import("../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} [outputPath]
 * @property {string} [servicesSource] The code that the import specifier 'renda:services' will resolve with.
 */

/**
 * @typedef {ReturnType<TaskBundleScripts["getResponseHandlers"]>} BundleScriptsMessengerResponseHandlers
 */

/**
 * @extends {Task<TaskBundleScriptsConfig>}
 */
export class TaskBundleScripts extends Task {
	static uiName = "Bundle Scripts";
	static type = "renda:bundleScripts";

	// @rollup-plugin-resolve-url-objects
	static workerUrl = new URL("../workers/bundleScripts/mod.js", import.meta.url);

	/** @type {TypedMessenger<import("../workers/bundleScripts/mod.js").BundleScriptsMessengerResponseHandlers, BundleScriptsMessengerResponseHandlers>} */
	#messenger;

	#lastReadScriptCallbackId = 0;
	/** @type {Map<number, (path: import("../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath) => Promise<string | null>>} */
	#readScriptCallbacks = new Map();

	static configStructure = createTreeViewStructure({
		entryPoints: {
			type: "array",
			guiOpts: {
				arrayType: "droppable",
				arrayGuiOpts: {
					supportedAssetTypes: [ProjectAssetTypeJavascript],
				},
			},
		},
		outputPath: {
			type: "array",
			guiOpts: {
				arrayType: "string",
			},
		},
	});

	/**
	 * @param  {ConstructorParameters<typeof Task>} args
	 */
	constructor(...args) {
		super(...args);

		this.#messenger = new TypedMessenger();
		this.#messenger.initialize(this.worker, this.getResponseHandlers());
	}

	/**
	 * @param {import("./Task.js").RunTaskOptions<TaskBundleScriptsConfig>} options
	 */
	async runTask({config, readAssetFromPath}) {
		const entryPoints = config?.entryPoints || [];
		if (entryPoints.length <= 0) {
			throw new Error("Failed to run task: no entry points provided");
		}
		const outputPath = config?.outputPath;
		if (!outputPath) {
			throw new Error("Failed to run task: no output path provided");
		}

		/**
		 * @param {import("../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
		 */
		const readScriptCallback = async path => {
			return await readAssetFromPath(path, {
				assertAssetType: ProjectAssetTypeJavascript,
			});
		};
		const readScriptCallbackId = this.#lastReadScriptCallbackId++;
		this.#readScriptCallbacks.set(readScriptCallbackId, readScriptCallback);
		const assetManager = this.studioInstance.projectManager.assertAssetManagerExists();
		const inputPaths = [];
		for (const entryPoint of entryPoints) {
			const asset = await assetManager.getProjectAssetFromUuid(entryPoint);
			if (asset) {
				if (asset.isBuiltIn) {
					throw new Error("Bundling built-in script assets are not yet supported.");
				}
				inputPaths.push(asset.path.join("/"));
			}
		}
		const result = await this.#messenger.send.bundle({
			inputPaths, outputPath,
			readScriptCallbackId,
			servicesSource: config?.servicesSource || "",
		});
		this.#readScriptCallbacks.delete(readScriptCallbackId);

		return result;
	}

	/**
	 * Generates response handlers for requests going from the worker to the main thread.
	 * This is a separate method so that we can use the return type for the TypedMessenger.
	 */
	getResponseHandlers() {
		return {
			/**
			 * @param {import("../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} filePath
			 * @param {number} readScriptCallbackId
			 */
			getScriptContent: async (filePath, readScriptCallbackId) => {
				const readScriptCallback = this.#readScriptCallbacks.get(readScriptCallbackId);
				if (!readScriptCallback) {
					throw new Error("Failed to get script content. Callback has already been destroyed.");
				}
				const result = await readScriptCallback(filePath);
				return result;
			},
		};
	}
}
