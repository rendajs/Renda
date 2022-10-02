import {TypedMessenger} from "../../../../src/util/TypedMessenger.js";
import {ProjectAssetTypeJavascript} from "../../assets/projectAssetType/ProjectAssetTypeJavascript.js";
import {createTreeViewStructure} from "../../ui/propertiesTreeView/createStructureHelpers.js";
import {Task} from "./Task.js";

/**
 * @typedef {ReturnType<TaskBuildApplication["getResponseHandlers"]>} BuildApplicationMessengerResponseHandlers
 */

/**
 * @typedef TaskBuildApplicationConfig
 * @property {import("../../../../src/mod.js").UuidString} [entryPoint]
 * @property {import("../../util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} [outputDir]
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

	/** @type {TypedMessenger<import("../workers/buildApplication/mod.js").BuildApplicationMessengerResponseHandlers, BuildApplicationMessengerResponseHandlers, true>} */
	#messenger;

	#lastContextId = 0;
	/** @type {Map<number, import("./Task.js").RunTaskOptions<TaskBuildApplicationConfig>>} */
	#contexts = new Map();

	/**
	 * @param  {ConstructorParameters<typeof Task>} args
	 */
	constructor(...args) {
		super(...args);

		this.#messenger = new TypedMessenger({transferSupport: true});
		this.#messenger.initialize(this.worker, this.getResponseHandlers());
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

	getResponseHandlers() {
		return {
			/**
			 * @param {number} contextId
			 * @param {import("../../../../src/mod.js").UuidString} uuid
			 */
			readJavaScript: async (contextId, uuid) => {
				const context = this.getContext(contextId);
				const javaScriptContent = await context.readAssetFromUuid(uuid, {
					assertAssetType: ProjectAssetTypeJavascript,
				});
				/** @type {import("../../../../src/util/TypedMessenger.js").RequestHandlerReturn} */
				const result = {
					returnValue: javaScriptContent,
				};
				return result;
			},
			/**
			 * @param {number} contextId
			 * @param {import("../../../../src/mod.js").UuidString[]} uuids
			 */
			bundleAssets: async (contextId, uuids) => {
				const context = this.getContext(contextId);
				/** @type {import("./TaskBundleAssets.js").TaskBundleAssetsConfig} */
				const bundleAssetsConfig = {
					assets: uuids.map(uuid => {
						return {
							asset: uuid,
							includeChildren: true,
						};
					}),
					outputPath: ["assetbundle"],
				};
				const bundleAssetsResult = await context.runChildTask("renda:bundleAssets", bundleAssetsConfig, {
					allowDiskWrites: false,
				});
				const assetBundle = bundleAssetsResult.writeAssets?.[0].fileData;
				if (!assetBundle) {
					throw new Error("Assertion failed, bundle asset tasks returned no file data");
				}
				if (!(assetBundle instanceof ArrayBuffer)) {
					throw new Error("Assertion failed: unexpected asset bundle file data, not an ArrayBuffer");
				}

				/** @type {import("../../../../src/util/TypedMessenger.js").RequestHandlerReturn} */
				const result = {
					returnValue: assetBundle,
					transfer: [assetBundle],
				};
				return result;
			},
			/**
			 * @param {number} contextId
			 * @param {import("../../../../src/mod.js").UuidString} entryPoint
			 */
			bundleScripts: async (contextId, entryPoint) => {
				const context = this.getContext(contextId);
				/** @type {import("./TaskBundleScripts.js").TaskBundleScriptsConfig} */
				const bundleScriptsConfig = {
					outputPath: ["js"],
					entryPoints: [entryPoint],
				};
				const bundleScriptsResult = await context.runChildTask("renda:bundleScripts", bundleScriptsConfig, {
					allowDiskWrites: false,
				});
				return {
					returnValue: bundleScriptsResult,
				};
			},
			/**
			 * @param {number} contextId
			 * @param {string} scriptSrc
			 */
			generateHtml: async (contextId, scriptSrc) => {
				const context = this.getContext(contextId);
				/** @type {import("./TaskGenerateHtml.js").TaskGenerateHtmlConfig} */
				const config = {
					outputLocation: ["index.html"],
					template: "264a38b9-4e43-4261-b57d-28a778a12dd9",
					replacements: [
						{find: "RENDA_IMPORT_MAP_TAG", replace: ""},
						{find: "HTML_SCRIPT_SRC", replace: scriptSrc},
					],
				};
				const result = await context.runChildTask("renda:generateHtml", config, {
					allowDiskWrites: false,
				});
				const html = result.writeAssets?.[0].fileData;
				if (typeof html != "string") {
					throw new Error("Failed to generate html.");
				}
				return {
					returnValue: html,
				};
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
		const result = await this.#messenger.send("buildApplication", contextId, options.config);
		this.#contexts.delete(contextId);
		return result;
	}
}
