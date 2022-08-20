import {getEditorInstance} from "../editorInstance.js";
import {autoRegisterTaskTypes} from "./autoRegisterTaskTypes.js";
import {Task} from "./task/Task.js";

/**
 * @typedef {<T extends import("../assets/AssetManager.js").AssetAssertionOptions>(path: import("../util/fileSystems/EditorFileSystem.js").EditorFileSystemPath, assertionOptions: T) => Promise<import("../assets/AssetManager.js").AssetAssertionOptionsToReadAssetDataReturn<T>?>} ReadAssetFromPathSignature
 */

/**
 * @typedef {<T extends import("../assets/AssetManager.js").AssetAssertionOptions>(uuid: import("../../../src/mod.js").UuidString, assertionOptions: T) => Promise<import("../assets/AssetManager.js").AssetAssertionOptionsToReadAssetDataReturn<T>?>} ReadAssetFromUuidSignature
 */

export class TaskManager {
	/** @type {Map<string, typeof import("./task/Task.js").Task>} */
	#registeredTasks = new Map();
	/** @type {Map<string, Task>} */
	#initializedTasks = new Map();

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
	 * @param {Object} options
	 * @param {import("../assets/projectAssetType/ProjectAssetTypeTask.js").TaskProjectAssetDiskData} options.taskFileContent
	 * The content of the task file to run.
	 */
	async runTask({taskFileContent}) {
		const taskType = this.initializeTask(taskFileContent.taskType);
		const assetManager = getEditorInstance().projectManager.assetManager;
		const result = await taskType.runTask({
			config: taskFileContent.taskConfig,
			needsAllGeneratedAssets: false,
			async readAssetFromPath(path, assertionOptions) {
				const asset = await assetManager?.getProjectAssetFromPath(path, {assertionOptions});
				const result = await asset?.readAssetData();
				return result || null;
			},
			async readAssetFromUuid(uuid, assertionOptions) {
				const asset = await assetManager?.getProjectAssetFromUuid(uuid, assertionOptions);
				const result = await asset?.readAssetData();
				return result || null;
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
				await asset.writeAssetData(/** @type {Object} **/ (writeAssetData.fileData));
			}
		}
	}
}
