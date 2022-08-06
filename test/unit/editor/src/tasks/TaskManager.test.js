import {assertEquals, assertExists, assertInstanceOf, assertThrows} from "std/testing/asserts.ts";
import {Task} from "../../../../../editor/src/tasks/task/Task.js";
import {TaskManager} from "../../../../../editor/src/tasks/TaskManager.js";
import {assertSpyCalls, spy} from "std/testing/mock.ts";
import {TypedMessenger} from "../../../../../src/util/TypedMessenger.js";

const BASIC_UUID = "00000000-0000-0000-0000-000000000000";

Deno.test({
	name: "init(), registers the default task types",
	fn() {
		const manager = new TaskManager();
		manager.init();

		const result = manager.getTaskType("JJ:bundleScripts");

		assertExists(result);
	},
});

Deno.test({
	name: "getTaskType() throws when the task doesn't exist",
	fn() {
		const manager = new TaskManager();
		manager.init();

		assertThrows(() => {
			manager.getTaskType("nonexistent");
		}, Error, `Task type "nonexistent" is not registered.`);
	},
});

Deno.test({
	name: "registering a task with an incorrect constructor type throws",
	fn() {
		const manager = new TaskManager();

		assertThrows(() => {
			manager.registerTaskType(/** @type {any} */ ({}));
		}, Error, "Tried to register task (undefined) that does not extend the Task class.");
	},
});

Deno.test({
	name: "registering a task with a missing 'type' property throws",
	fn() {
		const manager = new TaskManager();

		class ExtendedTask extends Task {}

		assertThrows(() => {
			manager.registerTaskType(ExtendedTask);
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
				manager.registerTaskType(ExtendedTask);
			}, Error, "Tried to register task (ExtendedTask) without a namespace in the type value.");
		}
	},
});

Deno.test({
	name: "registering a task with a missing 'workerUrl' property throws",
	fn() {
		const manager = new TaskManager();

		class ExtendedTask extends Task {
			static type = "namespace:type";
			static typeUuid = BASIC_UUID;
		}

		assertThrows(() => {
			manager.registerTaskType(ExtendedTask);
		}, Error, "Tried to register task (ExtendedTask) with no workerUrl value, override the static workerUrl value in order for this task to function properly.");
	},
});

Deno.test({
	name: "running a task",
	async fn() {
		const manager = new TaskManager();

		/** @extends {Task<{}>} */
		class ExtendedTask extends Task {
			static type = "namespace:type";
			static typeUuid = BASIC_UUID;
			static workerUrl = new URL("./shared/basicWorker.js", import.meta.url);

			/** @type {TypedMessenger<import("./shared/basicWorker.js").BasicWorkerResponseHandlers, {}>} */
			#messenger;

			/** @param {ConstructorParameters<typeof Task>} args */
			constructor(...args) {
				super(...args);
				this.#messenger = new TypedMessenger();
				this.#messenger.setSendHandler(data => {
					this.worker.postMessage(data);
				});
				this.worker.addEventListener("message", event => {
					this.#messenger.handleReceivedMessage(event.data);
				});
			}

			/**
			 * @param {{}} config
			 */
			async runTask(config) {
				return await this.#messenger.send("repeatString", "foo");
			}
		}

		const runTaskSpy = spy(ExtendedTask.prototype, "runTask");

		manager.registerTaskType(ExtendedTask);
		const result = await manager.runTask({
			taskFileContent: {
				taskType: "namespace:type",
			},
		});

		assertSpyCalls(runTaskSpy, 1);
		assertEquals(result, "foo");

		const taskInstance = manager.initializeTask("namespace:type");
		assertInstanceOf(taskInstance, ExtendedTask);
		taskInstance.worker.terminate();
	},
});
