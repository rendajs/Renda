import {ProjectAssetTypeTask} from "../assets/projectAssetType/ProjectAssetTypeTask.js";
import {getEditorInstance} from "../editorInstance.js";
import {autoRegisterTaskTypes} from "./autoRegisterTaskTypes.js";
import {fillEnvironmentVariables} from "./environmentVariables.js";
import {Task} from "./task/Task.js";

/**
 * @typedef {<T extends import("../assets/AssetManager.js").AssetAssertionOptions>(path: import("../util/fileSystems/EditorFileSystem.js").EditorFileSystemPath, assertionOptions: T) => Promise<import("../assets/AssetManager.js").AssetAssertionOptionsToReadAssetDataReturn<T>?>} ReadAssetFromPathSignature
 */

/**
 * @typedef {<T extends import("../assets/AssetManager.js").AssetAssertionOptions>(uuid: import("../../../src/mod.js").UuidString, assertionOptions?: T) => Promise<import("../assets/AssetManager.js").AssetAssertionOptionsToReadAssetDataReturn<T>?>} ReadAssetFromUuidSignature
 */

/**
 * @typedef {(uuid: import("../../../src/mod.js").UuidString) => Promise<void>} RunDependencyTaskSignature
 */

/**
 * Options passed into {@linkcode TaskManager.runTask}.
 * @typedef RunTaskOptions
 * @property {Object<string, string>} [environmentVariables] These environment variables will be
 * applied to the task config. Any environment variables specified in the task asset will be replaced.
 * Both the environment variables passed in the options object as well as the variables stored in
 * the task asset are passed down to any child tasks that are run as a result of running this task.
 */

export class TaskManager {
	/** @type {Map<string, typeof import("./task/Task.js").Task>} */
	#registeredTasks = new Map();
	/** @type {Map<string, Task>} */
	#initializedTasks = new Map();

	/** @typedef {import("../assets/ProjectAsset.js").ProjectAsset<ProjectAssetTypeTask>} TaskProjectAsset */

	/**
	 * This keeps track of which files were generated by which tasks.
	 * This is to run child tasks in case a task has one of these files as a dependency.
	 * @type {WeakMap<import("../assets/ProjectAsset.js").ProjectAssetAny, TaskProjectAsset>}
	 */
	#touchedTaskAssets = new WeakMap();

	init() {
		for (const task of autoRegisterTaskTypes) {
			this.registerTaskType(task);
		}
	}

	/**
	 * @param {new (...args: any[]) => any} taskConstructor
	 */
	registerTaskType(taskConstructor) {
		const castConstructor = /** @type {typeof Task} */ (taskConstructor);
		if (!(taskConstructor.prototype instanceof Task)) {
			throw new Error("Tried to register task (" + taskConstructor.name + ") that does not extend the Task class.");
		}
		if (!castConstructor.type) {
			throw new Error("Tried to register task (" + castConstructor.name + ") with no type value, override the static type value in order for this task to function properly.");
		}
		if (!castConstructor.type.includes(":") || castConstructor.type.split(":").filter(s => Boolean(s)).length < 2) {
			throw new Error("Tried to register task (" + castConstructor.name + ") without a namespace in the type value.");
		}

		this.#registeredTasks.set(castConstructor.type, castConstructor);
	}

	/**
	 * @param {string} taskType
	 */
	getTaskType(taskType) {
		const taskTypeConstructor = this.#registeredTasks.get(taskType);
		if (!taskTypeConstructor) {
			throw new Error(`Task type "${taskType}" is not registered.`);
		}
		return taskTypeConstructor;
	}

	*getTaskTypes() {
		for (const taskType of this.#registeredTasks.values()) {
			yield taskType;
		}
	}

	/**
	 * @param {string} taskType
	 */
	initializeTask(taskType) {
		let task = this.#initializedTasks.get(taskType);
		if (task) return task;

		const TaskConstructor = this.getTaskType(taskType);
		const editor = getEditorInstance();
		task = new TaskConstructor(editor);
		this.#initializedTasks.set(taskType, task);
		return task;
	}

	/**
	 * Runs a task with a specified configuration in a worker.
	 * @param {import("../assets/ProjectAsset.js").ProjectAssetAny} taskAsset The task asset to run.
	 * If this asset is not a ProjectAssetTypeTask, this function will throw.
	 * @param {RunTaskOptions} options
	 */
	async runTask(taskAsset, options = {}) {
		await taskAsset.waitForInit();
		taskAsset.assertIsAssetTypeSync(ProjectAssetTypeTask);
		const taskFileContent = await taskAsset.readAssetData();
		const taskType = this.initializeTask(taskFileContent.taskType);
		const assetManager = getEditorInstance().projectManager.assetManager;

		const environmentVariables = {
			...taskFileContent.environmentVariables,
			...options.environmentVariables,
		};

		const config = taskFileContent.taskConfig;
		fillEnvironmentVariables(config, environmentVariables);

		/**
		 * @template T
		 * @param {import("../assets/ProjectAsset.js").ProjectAsset<import("../assets/AssetManager.js").AssetAssertionOptionsToProjectAssetType<T>>?} asset
		 */
		const runDependencyTasksAndRead = async asset => {
			if (!asset) return null;
			const taskAsset = this.#touchedTaskAssets.get(asset);
			if (taskAsset) {
				await this.runTask(taskAsset, {environmentVariables});
			}
			const result = await asset?.readAssetData();
			return result || null;
		};

		const result = await taskType.runTask({
			config,
			needsAllGeneratedAssets: false,
			async readAssetFromPath(path, assertionOptions) {
				const asset = await assetManager?.getProjectAssetFromPath(path, {assertionOptions}) || null;
				return await runDependencyTasksAndRead(asset);
			},
			async readAssetFromUuid(uuid, assertionOptions) {
				const asset = await assetManager?.getProjectAssetFromUuid(uuid, assertionOptions) || null;
				return await runDependencyTasksAndRead(asset);
			},
			runDependencyTask: async uuid => {
				const taskAsset = await assetManager?.getProjectAssetFromUuid(uuid, {
					assertAssetType: [ProjectAssetTypeTask],
				});
				if (!taskAsset) throw new Error(`No asset was found with uuid "${uuid}".`);
				await this.runTask(taskAsset, {environmentVariables});
			},
		});

		if (result.writeAssets) {
			for (const writeAssetData of result.writeAssets) {
				if (!assetManager) {
					throw new Error("Failed to write files from task, asset manager is not available.");
				}
				// TODO: Assert that the asset has the correct type. #67
				let asset = await assetManager.getProjectAssetFromPath(writeAssetData.path);
				if (!asset) {
					asset = await assetManager.registerAsset(writeAssetData.path, writeAssetData.assetType);
				}
				await asset.writeAssetData(/** @type {object} **/ (writeAssetData.fileData));
				this.#touchedTaskAssets.set(asset, taskAsset);
			}
		}
		if (result.touchedAssets) {
			if (!assetManager) {
				throw new Error("Failed to register touched assets, asset manager is not available.");
			}
			for (const assetUuid of result.touchedAssets) {
				const asset = await assetManager.getProjectAssetFromUuid(assetUuid);
				if (asset) {
					this.#touchedTaskAssets.set(asset, taskAsset);
				}
			}
		}
	}

	/**
	 * @param {string} taskType
	 * @param {unknown} uiConfigData
	 */
	transformUiToAssetData(taskType, uiConfigData) {
		const task = this.getTaskType(taskType);
		return task.transformUiToAssetData(uiConfigData);
	}

	/**
	 * @param {string} taskType
	 * @param {unknown} assetConfigData
	 */
	transformAssetToUiData(taskType, assetConfigData) {
		const task = this.getTaskType(taskType);
		return task.transformAssetToUiData(assetConfigData);
	}
}
