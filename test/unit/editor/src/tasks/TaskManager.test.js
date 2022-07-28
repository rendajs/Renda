import {assertThrows} from "std/testing/asserts";
import {Task} from "../../../../../editor/src/tasks/task/Task.js";
import {TaskManager} from "../../../../../editor/src/tasks/TaskManager.js";

const BASIC_UUID = "00000000-0000-0000-0000-000000000000";

Deno.test({
	name: "init(), registers the default asset types",
	ignore: true,
	fn() {
		const manager = new TaskManager();
		manager.init();

		// const result = manager.getAssetType("JJ:mesh");

		// assertExists(result);
	},
});

Deno.test({
	name: "registering a task with an incorrect constructor type throws",
	fn() {
		const manager = new TaskManager();

		assertThrows(() => {
			manager.registerTask(/** @type {any} */ ({}));
		}, Error, "Tried to register task (undefined) that does not extend the Task class.");
	},
});

Deno.test({
	name: "registering a task with a missing 'type' property throws",
	fn() {
		const manager = new TaskManager();

		class ExtendedTask extends Task {}

		assertThrows(() => {
			manager.registerTask(ExtendedTask);
		}, Error, "Tried to register task (ExtendedTask) with no type value, override the static type value in order for this task to function properly.");
	},
});

Deno.test({
	name: "registering a task with an incorrect 'type' format throws",
	fn() {
		const manager = new TaskManager();

		const wrongTypes = [
			"missingcolon",
			":nonamespace",
			"notype:",
		];

		for (const typeStr of wrongTypes) {
			class ExtendedTask extends Task {
				static type = typeStr;
				static typeUuid = BASIC_UUID;
			}

			assertThrows(() => {
				manager.registerTask(ExtendedTask);
			}, Error, "Tried to register task (ExtendedTask) without a namespace in the type value.");
		}
	},
});
