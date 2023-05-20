import {ProjectAssetTypeTask} from "../../assets/projectAssetType/ProjectAssetTypeTask.js";
import {createTreeViewStructure} from "../../ui/propertiesTreeView/createStructureHelpers.js";
import {Task} from "./Task.js";

/**
 * @fileoverview A task that runs multiple tasks.
 */

const taskGroupStructure = createTreeViewStructure({
	task: {
		type: "droppable",
		guiOpts: {
			supportedAssetTypes: [ProjectAssetTypeTask],
		},
	},
	parallel: {
		type: "boolean",
		guiOpts: {
			defaultValue: true,
		},
	},
	subTasks: {
		type: "array",
		guiOpts: {
			arrayType: "object",
			arrayGuiOpts: {
				structure: {},
			},
		},
	},
});
taskGroupStructure.subTasks.guiOpts.arrayGuiOpts.structure = taskGroupStructure;

const configStructure = createTreeViewStructure({
	taskGroup: {
		type: "object",
		guiOpts: {
			structure: taskGroupStructure,
		},
	},
});

/**
 * @typedef TaskGroup
 * @property {boolean} [parallel]
 * @property {(import("../../../../src/mod.js").UuidString | TaskGroup | undefined)[]} [tasks]
 */

/**
 * @typedef TaskRunMultipleConfig
 * @property {TaskGroup} [taskGroup]
 */

/** @extends {Task<TaskRunMultipleConfig>} */
export class TaskRunMultiple extends Task {
	static uiName = "Run Multiple Tasks";
	static type = "renda:runMultiple";
	static configStructure = configStructure;

	/** @typedef {import("../../ui/propertiesTreeView/types.ts").GetStructureValuesReturnType<typeof configStructure, {purpose: "fileStorage"}>} TransformUiConfig */

	/**
	 * @param {TransformUiConfig} uiConfigData
	 * @returns {TaskRunMultipleConfig | undefined}
	 */
	static transformUiToAssetData(uiConfigData) {
		if (!uiConfigData) return undefined;
		const recursionResult = this.#recursiveTransformUiTaskGroup(uiConfigData.taskGroup);
		/** @type {TaskGroup | undefined} */
		let taskGroup;
		if (typeof recursionResult == "string") {
			taskGroup = {
				tasks: [recursionResult],
			};
		} else {
			taskGroup = recursionResult;
		}
		return {taskGroup};
	}

	/**
	 * @typedef AssetDataTaskGroup
	 * @property {boolean} [parallel]
	 * @property {import("../../../../src/mod.js").UuidString?} [task]
	 * @property {(AssetDataTaskGroup | undefined)[]} [subTasks]
	 */

	/**
	 * @param {AssetDataTaskGroup | undefined} taskGroup
	 * @returns {TaskGroup | import("../../../../src/mod.js").UuidString | undefined}
	 */
	static #recursiveTransformUiTaskGroup(taskGroup) {
		if (!taskGroup) return undefined;
		if (taskGroup.task) {
			return taskGroup.task;
		} else {
			/** @type {TaskGroup} */
			const newTaskGroup = {};
			let hasData = false;
			if (taskGroup.parallel != undefined) {
				newTaskGroup.parallel = taskGroup.parallel;
				hasData = true;
			}
			if (taskGroup.subTasks && taskGroup.subTasks.length > 0) {
				const newSubTasks = [];
				for (const subTask of taskGroup.subTasks) {
					const newSubTask = this.#recursiveTransformUiTaskGroup(subTask);
					if (!newSubTask) continue;
					newSubTasks.push(newSubTask);
				}
				newTaskGroup.tasks = newSubTasks;
				hasData = true;
			}
			if (!hasData) return undefined;
			return newTaskGroup;
		}
	}

	/**
	 * @param {TaskRunMultipleConfig | undefined} assetConfigData
	 * @returns {TransformUiConfig}
	 */
	static transformAssetToUiData(assetConfigData) {
		if (!assetConfigData) return undefined;
		const recursionResult = this.#recursiveTransformAssetTaskGroup(assetConfigData.taskGroup);
		if (!recursionResult) return undefined;
		return {
			// @ts-expect-error See #118
			taskGroup: recursionResult,
		};
	}

	/**
	 * @param {TaskGroup | import("../../../../src/mod.js").UuidString | undefined} taskGroup
	 * @returns {AssetDataTaskGroup | undefined}
	 */
	static #recursiveTransformAssetTaskGroup(taskGroup) {
		if (!taskGroup) return undefined;
		if (typeof taskGroup == "string") {
			return {
				task: taskGroup,
			};
		} else {
			/** @type {AssetDataTaskGroup} */
			const newTaskGroup = {};
			if (taskGroup.parallel != undefined) newTaskGroup.parallel = taskGroup.parallel;
			if (taskGroup.tasks && taskGroup.tasks.length > 0) {
				const newSubTasks = [];
				for (const subTask of taskGroup.tasks) {
					const newSubTask = this.#recursiveTransformAssetTaskGroup(subTask);
					newSubTasks.push(newSubTask);
				}
				newTaskGroup.subTasks = newSubTasks;
			}
			return newTaskGroup;
		}
	}

	/**
	 * @param {import("./Task.js").RunTaskOptions<TaskRunMultipleConfig>} options
	 */
	async runTask({config, runDependencyTaskAsset}) {
		if (!config?.taskGroup) return {};

		/**
		 * @param {import("../../../../src/mod.js").UuidString | TaskGroup} taskGroup
		 */
		async function runTaskGroup(taskGroup) {
			if (typeof taskGroup == "string") {
				await runDependencyTaskAsset(taskGroup);
			} else if (taskGroup.tasks) {
				const parallel = taskGroup.parallel ?? true;
				if (parallel) {
					const promises = [];
					for (const task of taskGroup.tasks) {
						if (!task) continue;
						promises.push(runTaskGroup(task));
					}
					await Promise.all(promises);
				} else {
					for (const task of taskGroup.tasks) {
						if (!task) continue;
						await runTaskGroup(task);
					}
				}
			}
		}

		await runTaskGroup(config.taskGroup);

		return {};
	}
}
