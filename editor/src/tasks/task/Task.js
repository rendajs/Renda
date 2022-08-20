/**
 * @typedef {new (...args: ConstructorParameters<typeof Task>) => Task} TaskConstructor
 */

/**
 * @typedef RunTaskReturn
 * @property {import("../../../../src/mod.js").UuidString[]} [dependencyAssets] A list of asset uuids that this task depends on.
 * In general you want to use {@linkcode RunTaskOptions.readAssetFromPath} or {@linkcode RunTaskOptions.readAssetFromUuid} to get asset data.
 * But if you want to use read asset data in more complicated ways, use this to notify the task manager which assets you have also used.
 * This is used for caching, watching and determining which other tasks need to be run before this one.
 * Before a task is run, all dependency assets are checked to see if they have been modified, if not the task will not run.
 * When a task is being run in watch mode, the dependency assets are continuously checked for changes.
 * If other tasks report that they are responsible for generating these assets using either `writeAssets` or `touchedAssets`,
 * These tasks will run first before this one when required.
 * @property {RunTaskCreateAssetData[]} [writeAssets] A list of assets that this task should create when done running.
 * This is useful if you want to modify files in a very basic way. The assets will be created and written to the output location.
 * If the task is run programmatically, nothing is written and the program running the task can handle the result accordingly.
 * Note that if you are not writing some assets as a result of caching, but might write them in the future, you should add them to the `touchedAssets` list.
 * This way other tasks can trigger this task to run if it depends on them.
 * If you need more control over how assets are written, such as writing to a file stream, you can write them manually using
 * the current editor file system. But be sure to list the changed assets in `touchedAssets` as well. Though when using this
 * method, the task won't be able to be used programmatically. Unless you handle this case specifically when the `needsAlltouchedAssets`
 * flag is set to true.
 * @property {import("../../../../src/mod.js").UuidString[]} [touchedAssets] A list of assets that this task touched, or
 * might touch when the task is a second time. This is used by other tasks for determining if this task needs to run before them.
 */

/**
 * @typedef RunTaskCreateAssetData
 * @property {import("../../util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} path
 * @property {string} assetType
 * @property {import("../../util/fileSystems/EditorFileSystem.js").AllowedWriteFileTypes} fileData
 */

/**
 * @template TTaskConfig
 * @typedef RunTaskOptions
 * @property {TTaskConfig} config
 * @property {boolean} needsAllGeneratedAssets If true, running this task was triggered programmatically.
 * In this case the task should not write any assets to disk and return the changes in `writeAssets` instead.
 * @property {import("../TaskManager.js").ReadAssetFromPathSignature} readAssetFromPath Reads an asset from the file system.
 * And marks the asset as a dependency of this task. If you need more control over reading assets you can read them manually
 * but be sure to mark files as a dependency using {@linkcode RunTaskReturn.dependencyAssets}.
 * @property {import("../TaskManager.js").ReadAssetFromUuidSignature} readAssetFromUuid Reads an asset from the file system.
 * And marks the asset as a dependency of this task. If you need more control over reading assets you can read them manually
 * but be sure to mark files as a dependency using {@linkcode RunTaskReturn.dependencyAssets}.
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
	 * @param {RunTaskOptions<TTaskConfig>} options
	 * @returns {Promise<RunTaskReturn>}
	 */
	async runTask(options) {
		throw new Error(`Task "${this.constructor.name}" does not implement runTask().`);
	}
}
