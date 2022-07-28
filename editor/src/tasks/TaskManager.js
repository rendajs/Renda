import {autoRegisterTasks} from "./autoRegisterTasks.js";
import {Task} from "./task/Task.js";

export class TaskManager {
	constructor() {
		this.registeredTasks = new Map();
	}

	init() {
		for (const task of autoRegisterTasks) {
			this.registerTask(task);
		}
	}

	/**
	 * @param {import("./task/Task.js").TaskConstructor} taskConstructor
	 */
	registerTask(taskConstructor) {
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

		this.registeredTasks.set(castConstructor.type, castConstructor);
	}
}
