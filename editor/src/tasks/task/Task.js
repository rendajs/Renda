
/**
 * @typedef {new (...args: ConstructorParameters<typeof Task>) => Task} TaskConstructor
 */

/**
 * @template [TTaskConfig = unknown]
 */
export class Task {
	/**
	 * Name that will be shown in the editor ui.
	 * @type {string}
	 */
	static uiName = "";

	/**
	 * This is used for identifying the task type in configuration files.
	 * This should have the format "namespace:taskType", for example: "renda:bundleScripts".
	 * @type {import("../../../../src/util/mod.js").UuidString}
	 */
	static type = "";

	/**
	 * The main entry point of the worker that should be created for running
	 * tasks of this type.
	 * @type {URL?}
	 */
	static workerUrl = null;

	/** @type {Worker?} */
	#worker = null;

	get worker() {
		if (!this.#worker) {
			throw new Error("This task does not have a worker. If you wish to use a worker, make sure the the static workerUrl property is set.");
		}
		return this.#worker;
	}

	/**
	 * The structure of the ui that should be rendered in the properties content window.
	 * @type {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure?}
	 */
	static configStructure = null;

	/**
	 * @param {import("../../Editor.js").Editor} editorInstance
	 */
	constructor(editorInstance) {
		this.editorInstance = editorInstance;

		const castConstructor = /** @type {typeof Task} */ (this.constructor);
		if (castConstructor.workerUrl) {
			this.#worker = new Worker(castConstructor.workerUrl, {
				type: "module",
			});
		}
	}

	/**
	 * @param {TTaskConfig} config
	 * @returns {Promise<unknown>}
	 */
	async runTask(config) {
		throw new Error(`Task "${this.constructor.name}" does not implement runTask().`);
	}
}
