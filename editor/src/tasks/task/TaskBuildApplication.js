import {TypedMessenger} from "../../../../src/util/TypedMessenger.js";
import {ProjectAssetTypeJavascript} from "../../assets/projectAssetType/ProjectAssetTypeJavascript.js";
import {createTreeViewStructure} from "../../ui/propertiesTreeView/createStructureHelpers.js";
import {Task} from "./Task.js";

/**
 * @typedef {ReturnType<TaskBuildApplication["getResponseHandlers"]>} BuildApplicationMessengerResponseHandlers
 */

/**
 * @typedef TaskBuildApplicationConfig
 * @property {import("../../../../src/mod.js").UuidString} entryPoint
 * @property {import("../../util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} outputDir
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

	/**
	 * @param  {ConstructorParameters<typeof Task>} args
	 */
	constructor(...args) {
		super(...args);

		this.#messenger = new TypedMessenger({transferSupport: true});
		this.#messenger.initialize(this.worker, this.getResponseHandlers());
	}

	getResponseHandlers() {
		return {};
	}

	/**
	 * @override
	 * @param {import("./Task.js").RunTaskOptions<TaskBuildApplicationConfig>} options
	 */
	async runTask({config, readAssetFromPath}) {
		return {};
	}
}
