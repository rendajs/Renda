import {TypedMessenger} from "../../../../src/util/TypedMessenger/TypedMessenger.js";
import {ProjectAssetTypeJavascript} from "../../assets/projectAssetType/ProjectAssetTypeJavascript.js";
import {createTreeViewStructure} from "../../ui/propertiesTreeView/createStructureHelpers.js";
import {Task} from "./Task.js";

/**
 * @typedef {ReturnType<TaskBuildApplication["getResponseHandlers"]>} BuildApplicationMessengerResponseHandlers
 */

/**
 * @typedef TaskBuildApplicationConfig
 * @property {import("../../../../src/mod.js").UuidString} [entryPoint]
 * @property {import("../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} [outputDir]
 */

/** @extends {Task<TaskBuildApplicationConfig>} */
export class TaskBuildApplication extends Task {
	static uiName = "Build Application";
	static type = "renda:buildApplication";

	// @rollup-plugin-resolve-url-objects
	static workerUrl = new URL("../workers/buildApplication/mod.js", import.meta.url);

	static configStructure = createTreeViewStructure({
		entryPoint: {
			type: "droppable",
			guiOpts: {
				supportedAssetTypes: [ProjectAssetTypeJavascript],
			},
		},
		outputDir: {
			type: "path",
		},
	});

	/** @type {TypedMessenger<BuildApplicationMessengerResponseHandlers, import("../workers/buildApplication/mod.js").BuildApplicationMessengerResponseHandlers>} */
	#messenger;

	#lastContextId = 0;
	/** @type {Map<number, import("./Task.js").RunTaskOptions<TaskBuildApplicationConfig>>} */
	#contexts = new Map();

	/**
	 * @param  {ConstructorParameters<typeof Task>} args
	 */
	constructor(...args) {
		super(...args);

		this.#messenger = new TypedMessenger();
		this.#messenger.initializeWorker(this.worker, this.getResponseHandlers());
	}

	/**
	 * @param {number} contextId
	 */
	getContext(contextId) {
		const context = this.#contexts.get(contextId);
		if (!context) {
			throw new Error(`Assertion failed, context with id ${contextId} has been destroyed`);
		}
		return context;
	}

	/**
	 * Asserts if a task resulted in writing exactly one asset.
	 * @param {import("./Task.js").RunTaskReturn} taskResult
	 */
	#assertSingleWriteAsset(taskResult) {
		if (taskResult.writeAssets?.length != 1) {
			throw new Error("Assertion failed, task does not have exactly one write asset.");
		}
		return taskResult.writeAssets[0].fileData;
	}

	/**
	 * Asserts if a task resulted in writing exactly one asset that is a string.
	 * @param {import("./Task.js").RunTaskReturn} taskResult
	 */
	#assertSingleStringWriteAsset(taskResult) {
		const stringResult = this.#assertSingleWriteAsset(taskResult);
		if (typeof stringResult != "string") {
			throw new Error("Assertion failed, task did not result in a string asset");
		}
		return stringResult;
	}

	getResponseHandlers() {
		return {
			/**
			 * @param {number} contextId
			 * @param {import("../../../../src/mod.js").UuidString} uuid
			 */
			readJavaScript: async (contextId, uuid) => {
				const context = this.getContext(contextId);
				return await context.readAssetFromUuid(uuid, {
					assertAssetType: ProjectAssetTypeJavascript,
				});
			},
			/**
			 * @param {number} contextId
			 * @param {import("../../../../src/mod.js").UuidString[]} uuids
			 */
			bundleAssets: async (contextId, uuids) => {
				const context = this.getContext(contextId);
				const bundleAssetsResult = await context.runChildTask("renda:bundleAssets", {
					assets: uuids.map(uuid => {
						return {
							asset: uuid,
							includeChildren: true,
						};
					}),
					outputPath: ["assetbundle"],
				}, {
					allowDiskWrites: false,
				});
				const assetBundle = this.#assertSingleWriteAsset(bundleAssetsResult);
				if (!(assetBundle instanceof ArrayBuffer)) {
					throw new Error("Assertion failed: unexpected asset bundle file data, not an ArrayBuffer");
				}

				/** @satisfies {import("../../../../src/util/TypedMessenger/TypedMessenger.js").TypedMessengerRequestHandlerReturn} */
				const result = {
					$respondOptions: {
						returnValue: assetBundle,
						transfer: [assetBundle],
					},
				};
				return result;
			},
			/**
			 * @param {object} options
			 * @param {number} options.contextId
			 * @param {import("../../../../src/mod.js").UuidString[]} options.usedAssetsUuids
			 * @param {import("../../../../src/mod.js").UuidString[]} options.entryPointUuids
			 */
			generateServices: async ({contextId, usedAssetsUuids, entryPointUuids}) => {
				const context = this.getContext(contextId);
				const generateServicesResult = await context.runChildTask("renda:generateServices", {
					outputLocation: ["services.js"],
					usedAssets: usedAssetsUuids,
					entryPoints: entryPointUuids,
				}, {
					allowDiskWrites: false,
				});
				const servicesScript = this.#assertSingleStringWriteAsset(generateServicesResult);

				return {
					servicesScript,
					usedAssets: generateServicesResult.customData?.usedAssets || [],
				};
			},
			/**
			 * @param {number} contextId
			 * @param {import("../../../../src/mod.js").UuidString} entryPoint
			 * @param {string} servicesSource
			 */
			bundleScripts: async (contextId, entryPoint, servicesSource) => {
				const context = this.getContext(contextId);
				return await context.runChildTask("renda:bundleScripts", {
					outputPath: ["js"],
					entryPoints: [entryPoint],
					servicesSource,
				}, {
					allowDiskWrites: false,
				});
			},
			/**
			 * @param {number} contextId
			 * @param {string} scriptSrc
			 */
			generateHtml: async (contextId, scriptSrc) => {
				const context = this.getContext(contextId);
				const result = await context.runChildTask("renda:generateHtml", {
					outputLocation: ["index.html"],
					template: "264a38b9-4e43-4261-b57d-28a778a12dd9",
					replacements: [
						{find: "RENDA_IMPORT_MAP_TAG", replace: ""},
						{find: "HTML_SCRIPT_SRC", replace: scriptSrc},
					],
				}, {
					allowDiskWrites: false,
				});
				return this.#assertSingleStringWriteAsset(result);
			},
		};
	}

	/**
	 * @override
	 * @param {import("./Task.js").RunTaskOptions<TaskBuildApplicationConfig>} options
	 */
	async runTask(options) {
		const contextId = this.#lastContextId++;
		this.#contexts.set(contextId, options);
		const result = await this.#messenger.send.buildApplication(contextId, options.config);
		this.#contexts.delete(contextId);
		return result;
	}
}
