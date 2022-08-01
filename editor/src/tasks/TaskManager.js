import {autoRegisterTaskTypes} from "./autoRegisterTaskTypes.js";
import {Task} from "./task/Task.js";

export class TaskManager {
	/** @type {Map<string, import("./task/Task.js").TaskConstructor>} */
	#registeredTasks = new Map();
	/** @type {Map<string, Task>} */
	#initializedTasks = new Map();

	init() {
		for (const task of autoRegisterTaskTypes) {
			this.registerTaskType(task);
		}
	}

	/**
	 * @param {import("./task/Task.js").TaskConstructor} taskConstructor
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
		if (!castConstructor.workerUrl) {
			throw new Error(`Tried to register task (${castConstructor.name}) with no workerUrl value, override the static workerUrl value in order for this task to function properly.`);
		}

		this.#registeredTasks.set(castConstructor.type, taskConstructor);
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

	/**
	 * @param {string} taskType
	 */
	initializeTask(taskType) {
		let task = this.#initializedTasks.get(taskType);
		if (task) return task;

		const TaskConstructor = this.getTaskType(taskType);
		task = new TaskConstructor();
		this.#initializedTasks.set(taskType, task);
		return task;
	}

	/**
	 * Runs a task with a specified configuration in a worker.
	 * @param {Object} options
	 * @param {import("../assets/projectAssetType/TaskProjectAssetType.js").TaskProjectAssetDiskData} options.taskFileContent
	 * The content of the task file to run.
	 */
	async runTask({taskFileContent}) {
		const taskType = this.initializeTask(taskFileContent.taskType);
		return await taskType.runTask(taskFileContent.taskConfig);
	}
}
