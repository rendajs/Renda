import {TypedMessenger} from "../../../../src/util/TypedMessenger.js";
import {Task} from "./Task.js";

/**
 * @typedef TaskBundleScriptsConfig
 * @property {import("rollup").InputOption} scriptPaths
 */

/**
 * @extends {Task<TaskBundleScriptsConfig>}
 */
export class TaskBundleScripts extends Task {
	static uiName = "Bundle scripts";
	static type = "JJ:bundleScripts";

	// @rollup-plugin-resolve-url-objects
	static workerUrl = new URL("../workers/bundleScripts/mod.js", import.meta.url);

	/** @type {TypedMessenger<import("../workers/bundleScripts/mod.js").BundleScriptsMessengerResponseHandlers, {}>} */
	#messenger;

	constructor() {
		super();
		this.#messenger = new TypedMessenger();
		this.#messenger.setSendHandler(data => {
			this.worker.postMessage(data);
		});
		this.worker.addEventListener("message", event => {
			this.#messenger.handleReceivedMessage(event.data);
		});
	}

	/**
	 * @param {TaskBundleScriptsConfig} config
	 */
	async runTask(config) {
		await this.#messenger.send("bundle", config);
	}
}
