import {TypedMessenger} from "../../../../src/util/TypedMessenger.js";
import {createTreeViewStructure} from "../../ui/propertiesTreeView/createStructureHelpers.js";
import {Task} from "./Task.js";

/**
 * @typedef TaskBundleScriptsConfig
 * @property {import("../../util/fileSystems/EditorFileSystem.js").EditorFileSystemPath[]} scriptPaths
 * @property {import("../../util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} outputPath
 */

/**
 * Generates response handlers for requests going from the worker to the main thread.
 * @param {import("../../util/fileSystems/EditorFileSystem.js").EditorFileSystem} fileSystem
 */
function getResponseHandlers(fileSystem) {
	return {
		/**
		 * @param {import("../../util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} filePath
		 */
		async getScriptContent(filePath) {
			return await fileSystem.readText(filePath);
		},
		/**
		 * @param {import("../../util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} filePath
		 * @param {string} text
		 */
		async writeText(filePath, text) {
			return await fileSystem.writeText(filePath, text);
		},
	};
}

/**
 * @typedef {ReturnType<typeof getResponseHandlers>} BundleScriptsMessengerResponseHandlers
 */

/**
 * @extends {Task<TaskBundleScriptsConfig>}
 */
export class TaskBundleScripts extends Task {
	static uiName = "Bundle scripts";
	static type = "JJ:bundleScripts";

	// @rollup-plugin-resolve-url-objects
	static workerUrl = new URL("../workers/bundleScripts/mod.js", import.meta.url);

	/** @type {TypedMessenger<import("../workers/bundleScripts/mod.js").BundleScriptsMessengerResponseHandlers, BundleScriptsMessengerResponseHandlers>} */
	#messenger;

	static configStructure = createTreeViewStructure({
		scriptPaths: {
			type: "array",
			guiOpts: {
				arrayType: "array",
				arrayGuiOpts: {
					arrayType: "string",
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
		this.#messenger.setSendHandler(data => {
			this.worker.postMessage(data);
		});
		this.worker.addEventListener("message", event => {
			this.#messenger.handleReceivedMessage(event.data);
		});
		const fileSystem = this.editorInstance.projectManager.currentProjectFileSystem;
		if (!fileSystem) {
			throw new Error("Failed to create Bundle Scripts task: no project file system.");
		}
		this.#messenger.setResponseHandlers(getResponseHandlers(fileSystem));
	}

	/**
	 * @param {TaskBundleScriptsConfig} config
	 */
	async runTask(config) {
		await this.#messenger.send("bundle", config);
	}
}
