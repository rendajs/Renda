import "../../shared/initializeStudio.js";
import { assertEquals, assertExists, assertInstanceOf, assertRejects, assertThrows } from "std/testing/asserts.ts";
import { Task } from "../../../../../studio/src/tasks/task/Task.js";
import { TaskManager } from "../../../../../studio/src/tasks/TaskManager.js";
import { assertSpyCall, assertSpyCalls, spy, stub } from "std/testing/mock.ts";
import { TypedMessenger } from "../../../../../src/util/TypedMessenger/TypedMessenger.js";
import { injectMockStudioInstance } from "../../../../../studio/src/studioInstance.js";
import { createMockProjectAsset } from "../../shared/createMockProjectAsset.js";
import { stringArrayEquals } from "../../../../../src/mod.js";

Deno.test({
	name: "init(), registers the default task types",
	fn() {
		const manager = new TaskManager();
		manager.init();

		const result = manager.getTaskType("renda:bundleScripts");

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
	name: "getTaskTypes()",
	fn() {
		const manager = new TaskManager();
		class Task1 extends Task {
			static type = "namespace:type1";
		}
		class Task2 extends Task {
			static type = "namespace:type2";
		}
		manager.registerTaskType(Task1);
		manager.registerTaskType(Task2);

		const result = Array.from(manager.getTaskTypes()).map((t) => t.type);
		assertEquals(result, ["namespace:type1", "namespace:type2"]);
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
			}

			assertThrows(() => {
				manager.registerTaskType(ExtendedTask);
			}, Error, "Tried to register task (ExtendedTask) without a namespace in the type value.");
		}
	},
});

/**
 * @param {object} options
 * @param {{path: import("../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystemPath, projectAsset: import("../../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny}[]} [options.pathProjectAssets]
 * @param {Map<import("../../../../../src/mod.js").UuidString, import("../../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny>} [options.uuidProjectAssets] A map of mock project assets that will be returned by the asset manager.
 */
function basicTaskRunningSetup({
	pathProjectAssets = [],
	uuidProjectAssets = new Map(),
} = {}) {
	/**
	 * @typedef RegisteredAssetData
	 * @property {import("std/testing/mock.ts").Spy<import("../../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny, [fileData: import("../../../../../studio/src/assets/projectAssetType/ProjectAssetType").ProjectAssetDiskDataType], Promise<void>>} writeAssetDataSpy
	 */
	/** @type {RegisteredAssetData[]} */
	const registeredAssets = [];
	const mockStudio = /** @type {import("../../../../../studio/src/Studio.js").Studio} */ ({
		projectManager: {
			assetManager: {
				async getProjectAssetFromPath(path, options) {
					for (const { path: path2, projectAsset } of pathProjectAssets) {
						if (stringArrayEquals(path, path2)) {
							return projectAsset;
						}
					}
					return null;
				},
				async getProjectAssetFromUuid(uuid, options) {
					if (!uuid) return null;
					return uuidProjectAssets.get(uuid) || null;
				},
				async registerAsset(path, assetType) {
					const { projectAsset } = createMockProjectAsset();
					registeredAssets.push({
						writeAssetDataSpy: spy(projectAsset, "writeAssetData"),
					});
					return projectAsset;
				},
				fileSystem: {
					writeFile(path, file) {},
				},
			},
		},
	});
	injectMockStudioInstance(mockStudio);

	return {
		mockStudio,
		registeredAssets,
		cleanup() {
			injectMockStudioInstance(null);
		},
	};
}

Deno.test({
	name: "running a task asset",
	async fn() {
		const { registeredAssets, cleanup } = basicTaskRunningSetup();

		try {
			const manager = new TaskManager();

			/** @extends {Task<{}>} */
			class ExtendedTask extends Task {
				static type = "namespace:type";
				static workerUrl = new URL("./shared/basicWorker.js", import.meta.url);

				/** @type {TypedMessenger<{}, import("./shared/basicWorker.js").BasicWorkerResponseHandlers>} */
				#messenger;

				/** @param {ConstructorParameters<typeof Task>} args */
				constructor(...args) {
					super(...args);
					this.#messenger = new TypedMessenger();
					this.#messenger.setSendHandler((data) => {
						this.worker.postMessage(data.sendData);
					});
					this.worker.addEventListener("message", (event) => {
						this.#messenger.handleReceivedMessage(event.data);
					});
				}

				/**
				 * @param {import("../../../../../studio/src/tasks/task/Task.js").RunTaskOptions<{}>} options
				 */
				async runTask(options) {
					const str = await this.#messenger.send.repeatString("foo");
					/** @type {import("../../../../../studio/src/tasks/task/Task.js").RunTaskReturn} */
					const returnValue = {
						writeAssets: [
							{
								path: ["path", "to", "file.txt"],
								assetType: "namespace:type",
								fileData: str,
							},
						],
					};
					return returnValue;
				}
			}

			const runTaskSpy = spy(ExtendedTask.prototype, "runTask");

			const { projectAsset: taskProjectAsset } = createMockProjectAsset({
				readAssetDataReturnValue: {
					taskType: "namespace:type",
					taskConfig: {
						foo: "bar",
					},
				},
			});

			manager.registerTaskType(ExtendedTask);
			await manager.runTaskAsset(taskProjectAsset);

			assertSpyCalls(runTaskSpy, 1);
			assertEquals(runTaskSpy.calls[0].args[0].config, {
				foo: "bar",
			});
			assertEquals(runTaskSpy.calls[0].args[0].allowDiskWrites, true);

			assertEquals(registeredAssets.length, 1);
			const registeredAsset = registeredAssets[0];
			assertSpyCalls(registeredAsset.writeAssetDataSpy, 1);
			assertSpyCall(registeredAsset.writeAssetDataSpy, 0, {
				args: ["foo"],
			});

			const taskInstance = manager.initializeTask("namespace:type");
			assertInstanceOf(taskInstance, ExtendedTask);
			taskInstance.worker.terminate();
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "Running a tasks that writes a file without an asset type",
	async fn() {
		const { mockStudio, cleanup } = basicTaskRunningSetup();

		try {
			const manager = new TaskManager();

			/** @extends {Task<{}>} */
			class ExtendedTask extends Task {
				static type = "namespace:type";

				/**
				 * @param {import("../../../../../studio/src/tasks/task/Task.js").RunTaskOptions<{}>} options
				 */
				async runTask(options) {
					/** @type {import("../../../../../studio/src/tasks/task/Task.js").RunTaskReturn} */
					const returnValue = {
						writeAssets: [
							{
								path: ["path", "to", "file.txt"],
								fileData: "hello",
							},
						],
					};
					return returnValue;
				}
			}

			const fileSystem = mockStudio.projectManager.assetManager?.fileSystem;
			assertExists(fileSystem);
			const writeFileSpy = stub(fileSystem, "writeFile");

			manager.registerTaskType(ExtendedTask);
			await manager.runTask("namespace:type", {}, {
				allowDiskWrites: true,
			});

			assertSpyCalls(writeFileSpy, 1);
			assertSpyCall(writeFileSpy, 0, {
				args: [
					["path", "to", "file.txt"],
					"hello",
				],
			});
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "Running a non task asset should throw",
	async fn() {
		const { cleanup } = basicTaskRunningSetup();
		try {
			const manager = new TaskManager();

			const { projectAsset: nonTaskProjectAsset } = createMockProjectAsset({
				readAssetDataReturnValue: {
					foo: "bar",
				},
			});
			let init = false;
			stub(nonTaskProjectAsset, "waitForInit", async () => {
				init = true;
			});
			stub(nonTaskProjectAsset, "assertIsAssetTypeSync", () => {
				if (init) {
					throw new Error("Not a task");
				}
			});

			await assertRejects(async () => {
				await manager.runTaskAsset(nonTaskProjectAsset);
			}, Error, "Not a task");
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "running a task with a dependency task",
	async fn() {
		const DEPENDENDCY_PATH = ["path", "to", "dependency.txt"];
		const TYPELESS_DEPENDENDCY_PATH = ["path", "to", "typeless", "dependency.txt"];
		const TOUCHED_ASSET_UUID = "TOUCHED_ASSET_UUID";
		const TOUCHED_ASSET_PATH = ["touched", "path"];
		const CHILD_TASK_UUID = "CHILD_TASK_UUID";

		const { projectAsset: dependencyProjectAsset1 } = createMockProjectAsset();
		const { projectAsset: dependencyProjectAsset2 } = createMockProjectAsset();
		const { projectAsset: dependencyProjectAsset3 } = createMockProjectAsset();
		const { projectAsset: dependencyProjectAsset4 } = createMockProjectAsset();
		const { projectAsset: childTaskProjectAsset } = createMockProjectAsset({
			readAssetDataReturnValue: {
				taskType: "namespace:dependency",
				taskConfig: {},
			},
		});

		/** @type {Map<import("../../../../../src/mod.js").UuidString, import("../../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny>} */
		const uuidProjectAssets = new Map();
		uuidProjectAssets.set(TOUCHED_ASSET_UUID, dependencyProjectAsset2);
		uuidProjectAssets.set(CHILD_TASK_UUID, childTaskProjectAsset);
		const { cleanup } = basicTaskRunningSetup({
			pathProjectAssets: [
				{
					path: DEPENDENDCY_PATH,
					projectAsset: dependencyProjectAsset1,
				},
				{
					path: TYPELESS_DEPENDENDCY_PATH,
					projectAsset: dependencyProjectAsset3,
				},
				{
					path: TOUCHED_ASSET_PATH,
					projectAsset: dependencyProjectAsset4,
				},
			],
			uuidProjectAssets,
		});

		try {
			const manager = new TaskManager();

			let dependencyRunCount = 0;

			/**
			 * @typedef DependencyTaskConfig
			 * @property {string | undefined} assetType
			 * @property {import("../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} dependencyPath
			 */

			/** @extends {Task<DependencyTaskConfig>} */
			class DependencyTask extends Task {
				static type = "namespace:dependency";

				/**
				 * @param {import("../../../../../studio/src/tasks/task/Task.js").RunTaskOptions<DependencyTaskConfig>} options
				 */
				async runTask(options) {
					dependencyRunCount++;
					/** @type {import("../../../../../studio/src/tasks/task/Task.js").RunTaskReturn} */
					const returnValue = {
						writeAssets: [
							{
								path: options.config?.dependencyPath || [],
								assetType: options.config?.assetType,
								fileData: "foo",
							},
						],
						touchedAssets: [TOUCHED_ASSET_UUID],
						touchedPaths: [TOUCHED_ASSET_PATH],
					};
					return returnValue;
				}
			}
			manager.registerTaskType(DependencyTask);

			/**
			 * @typedef ParentTaskConfig
			 * @property {import("../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} [assetPath]
			 * @property {import("../../../../../src/mod.js").UuidString} [assetUuid]
			 * @property {import("../../../../../src/mod.js").UuidString} [taskAssetUuid]
			 */

			/** @extends {Task<ParentTaskConfig>} */
			class ParentTask extends Task {
				static type = "namespace:parent";

				/**
				 * @param {import("../../../../../studio/src/tasks/task/Task.js").RunTaskOptions<ParentTaskConfig>} options
				 */
				async runTask(options) {
					if (!options.config) return {};
					if (options.config.assetPath) {
						await options.readAssetFromPath(DEPENDENDCY_PATH, {});
					} else if (options.config.assetUuid) {
						await options.readAssetFromUuid(options.config.assetUuid, {});
					} else if (options.config.taskAssetUuid) {
						await options.runDependencyTaskAsset(options.config.taskAssetUuid);
					}
					return {};
				}
			}
			manager.registerTaskType(ParentTask);

			// First we run the dependency to let the manager know which dependencies are created/touched by this task.
			const { projectAsset: dependencyTaskAsset } = createMockProjectAsset({
				readAssetDataReturnValue: {
					taskType: "namespace:dependency",
					/** @type {DependencyTaskConfig} */
					taskConfig: {
						assetType: "namespace:type",
						dependencyPath: DEPENDENDCY_PATH,
					},
				},
			});
			await manager.runTaskAsset(dependencyTaskAsset);
			assertEquals(dependencyRunCount, 1);

			// Now we run a couple of dependency tasks to check if it causes the task to be run again:

			// This should run the dependency task again because DEPENDENDCY_PATH was written.
			const { projectAsset: parentTaskAsset1 } = createMockProjectAsset({
				readAssetDataReturnValue: {
					taskType: "namespace:parent",
					/** @type {ParentTaskConfig} */
					taskConfig: {
						assetPath: DEPENDENDCY_PATH,
					},
				},
			});
			await manager.runTaskAsset(parentTaskAsset1);
			assertEquals(dependencyRunCount, 2);

			// This should run the dependency task because TOUCHED_ASSET_UUID was touched.
			const { projectAsset: parentTaskAsset2 } = createMockProjectAsset({
				readAssetDataReturnValue: {
					taskType: "namespace:parent",
					/** @type {ParentTaskConfig} */
					taskConfig: {
						assetUuid: TOUCHED_ASSET_UUID,
					},
				},
			});
			await manager.runTaskAsset(parentTaskAsset2);
			assertEquals(dependencyRunCount, 3);

			// This should run the dependency task because it calls `runDependencyTaskAsset`.
			const { projectAsset: parentTaskAsset3 } = createMockProjectAsset({
				readAssetDataReturnValue: {
					taskType: "namespace:parent",
					/** @type {ParentTaskConfig} */
					taskConfig: {
						taskAssetUuid: CHILD_TASK_UUID,
					},
				},
			});
			await manager.runTaskAsset(parentTaskAsset3);
			assertEquals(dependencyRunCount, 4);

			// Now for a created asset that has no asset type
			const { projectAsset: typelessDependencyTaskAsset } = createMockProjectAsset({
				readAssetDataReturnValue: {
					taskType: "namespace:dependency",
					/** @type {DependencyTaskConfig} */
					taskConfig: {
						assetType: undefined,
						dependencyPath: TYPELESS_DEPENDENDCY_PATH,
					},
				},
			});
			await manager.runTaskAsset(typelessDependencyTaskAsset);
			assertEquals(dependencyRunCount, 5);

			// This should run the dependency task because TOUCHED_ASSET_PATH was touched.
			const { projectAsset: parentTaskAsset4 } = createMockProjectAsset({
				readAssetDataReturnValue: {
					taskType: "namespace:parent",
					/** @type {ParentTaskConfig} */
					taskConfig: {
						assetPath: TOUCHED_ASSET_PATH,
					},
				},
			});
			await manager.runTaskAsset(parentTaskAsset4);
			assertEquals(dependencyRunCount, 6);
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "Environment variables get passed to child tasks",
	async fn() {
		const TOUCHED_ASSET_UUID = "TOUCHED_ASSET_UUID";

		/**
		 * @typedef TaskConfig
		 * @property {boolean} [isParent]
		 * @property {string} replace
		 * @property {{replace: string}} replaceObj
		 */

		const { projectAsset: parentProjectAsset } = createMockProjectAsset({
			readAssetDataReturnValue: {
				taskType: "namespace:task",
				environmentVariables: {
					FOO_VAR: "parentfoo",
					BAR_VAR: "parentbar",
				},
				/** @type {TaskConfig} */
				taskConfig: {
					isParent: true,
					replace: "notreplaced $FOO_VAR notreplaced",
					replaceObj: {
						replace: "notreplaced $BAR_VAR notreplaced",
					},
				},
			},
		});
		const { projectAsset: childProjectAsset } = createMockProjectAsset({
			readAssetDataReturnValue: {
				taskType: "namespace:task",
				environmentVariables: {
					BAR_VAR: "childbar",
					BAZ_VAR: "childbaz",
				},
				/** @type {TaskConfig} */
				taskConfig: {
					replace: "notreplaced $BAR_VAR notreplaced",
					replaceObj: {
						replace: "notreplaced $BAZ_VAR notreplaced",
					},
				},
			},
		});
		/** @type {Map<import("../../../../../src/mod.js").UuidString, import("../../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny>} */
		const uuidProjectAssets = new Map();
		uuidProjectAssets.set(TOUCHED_ASSET_UUID, childProjectAsset);
		const { cleanup } = basicTaskRunningSetup({
			uuidProjectAssets,
		});

		try {
			const manager = new TaskManager();

			/** @type {import("std/testing/mock.ts").Spy<any, [TaskConfig], void>} */
			const runTaskSpy = spy();

			/** @extends {Task<TaskConfig>} */
			class ExtendedTask extends Task {
				static type = "namespace:task";

				/**
				 * @param {import("../../../../../studio/src/tasks/task/Task.js").RunTaskOptions<TaskConfig>} options
				 */
				async runTask(options) {
					if (!options.config) return {};
					runTaskSpy(options.config);
					const config = options.config;
					if (config.isParent) {
						await options.readAssetFromUuid(TOUCHED_ASSET_UUID);
						return {};
					} else {
						/** @type {import("../../../../../studio/src/tasks/task/Task.js").RunTaskReturn} */
						const returnValue = {
							touchedAssets: [TOUCHED_ASSET_UUID],
						};
						return returnValue;
					}
				}
			}
			manager.registerTaskType(ExtendedTask);

			// First we run the child task to register that it touched TOUCHED_ASSET_UUID
			// it should have its own environment variables.
			await manager.runTaskAsset(childProjectAsset);

			assertSpyCalls(runTaskSpy, 1);
			assertSpyCall(runTaskSpy, 0, {
				args: [
					{
						replace: "notreplaced childbar notreplaced",
						replaceObj: {
							replace: "notreplaced childbaz notreplaced",
						},
					},
				],
			});

			// Then we run the parent task, which should cause the child to get
			// run a second time.
			await manager.runTaskAsset(parentProjectAsset);

			assertSpyCalls(runTaskSpy, 3);
			assertSpyCall(runTaskSpy, 1, {
				args: [
					{
						isParent: true,
						replace: "notreplaced parentfoo notreplaced",
						replaceObj: {
							replace: "notreplaced parentbar notreplaced",
						},
					},
				],
			});
			assertSpyCall(runTaskSpy, 2, {
				args: [
					{
						replace: "notreplaced parentbar notreplaced",
						replaceObj: {
							replace: "notreplaced childbaz notreplaced",
						},
					},
				],
			});
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "transformUiToAssetData and transformAssetToUiData",
	fn() {
		const manager = new TaskManager();

		const taskType = "namespace:type";

		/** @extends {Task<{}>} */
		class ExtendedTask extends Task {
			static type = taskType;
		}
		manager.registerTaskType(ExtendedTask);

		const result1 = manager.transformUiToAssetData("namespace:type", { foo: "bar" });
		assertEquals(result1, { foo: "bar" });

		const result2 = manager.transformAssetToUiData("namespace:type", { foo: "bar" });
		assertEquals(result2, { foo: "bar" });
	},
});

function basicSetupForRunningProgrammatically() {
	const { cleanup, registeredAssets } = basicTaskRunningSetup();

	const manager = new TaskManager();

	/**
	 * @typedef TaskConfig
	 * @property {string} foo
	 */

	/** @extends {Task<TaskConfig>} */
	class ExtendedTask extends Task {
		static type = "namespace:type";

		/**
		 * @param {import("../../../../../studio/src/tasks/task/Task.js").RunTaskOptions<TaskConfig>} options
		 * @returns {Promise<import("../../../../../studio/src/tasks/task/Task.js").RunTaskReturn>}
		 */
		async runTask(options) {
			return {
				touchedAssets: ["touched asset"],
				touchedPaths: [["touched", "path"]],
				writeAssets: [
					{
						assetType: "namespace:assetType",
						path: ["path", "to", "file.txt"],
						fileData: "hello",
					},
				],
			};
		}
	}
	manager.registerTaskType(ExtendedTask);

	const runTaskSpy = spy(ExtendedTask.prototype, "runTask");

	return { cleanup, manager, runTaskSpy, registeredAssets };
}

Deno.test({
	name: "Running a task programmatically",
	async fn() {
		const { cleanup, manager, runTaskSpy, registeredAssets } = basicSetupForRunningProgrammatically();

		try {
			const result = await manager.runTask("namespace:type", { foo: "bar" });

			assertSpyCalls(runTaskSpy, 1);
			assertEquals(runTaskSpy.calls[0].args[0].allowDiskWrites, false);
			assertEquals(runTaskSpy.calls[0].args[0].config, { foo: "bar" });
			assertEquals(result, {
				touchedAssets: ["touched asset"],
				touchedPaths: [["touched", "path"]],
				writeAssets: [
					{
						assetType: "namespace:assetType",
						path: ["path", "to", "file.txt"],
						fileData: "hello",
					},
				],
			});
			assertEquals(registeredAssets.length, 0);
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "Running a task programmatically, allow disk writes set to true",
	async fn() {
		const { cleanup, manager, runTaskSpy, registeredAssets } = basicSetupForRunningProgrammatically();

		try {
			const result = await manager.runTask("namespace:type", { foo: "bar" }, {
				allowDiskWrites: true,
			});

			assertSpyCalls(runTaskSpy, 1);
			assertEquals(runTaskSpy.calls[0].args[0].allowDiskWrites, true);
			assertEquals(runTaskSpy.calls[0].args[0].config, { foo: "bar" });
			assertEquals(result, {
				touchedAssets: ["touched asset"],
				touchedPaths: [["touched", "path"]],
				writeAssets: [
					{
						assetType: "namespace:assetType",
						path: ["path", "to", "file.txt"],
						fileData: "hello",
					},
				],
			});
			assertEquals(registeredAssets.length, 1);
			assertSpyCalls(registeredAssets[0].writeAssetDataSpy, 1);
			assertSpyCall(registeredAssets[0].writeAssetDataSpy, 0, {
				args: ["hello"],
			});
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "Task that directly runs a child task",
	async fn() {
		const { cleanup } = basicTaskRunningSetup();

		try {
			const manager = new TaskManager();

			/** @extends {Task<{}>} */
			class ExtendedTask1 extends Task {
				static type = "namespace:type1";

				/**
				 * @param {import("../../../../../studio/src/tasks/task/Task.js").RunTaskOptions<{}>} options
				 * @returns {Promise<import("../../../../../studio/src/tasks/task/Task.js").RunTaskReturn>}
				 */
				async runTask(options) {
					options.runChildTask("namespace:type2", options.config);
					return {
					};
				}
			}
			manager.registerTaskType(ExtendedTask1);

			/** @extends {Task<{}>} */
			class ExtendedTask2 extends Task {
				static type = "namespace:type2";

				/**
				 * @param {import("../../../../../studio/src/tasks/task/Task.js").RunTaskOptions<{}>} options
				 * @returns {Promise<import("../../../../../studio/src/tasks/task/Task.js").RunTaskReturn>}
				 */
				async runTask(options) {
					return {};
				}
			}
			manager.registerTaskType(ExtendedTask2);

			const runTaskSpy = spy(ExtendedTask2.prototype, "runTask");

			await manager.runTask("namespace:type1", { foo: "bar" });
			assertSpyCalls(runTaskSpy, 1);
			assertEquals(runTaskSpy.calls[0].args[0].allowDiskWrites, false);
			assertEquals(runTaskSpy.calls[0].args[0].config, { foo: "bar" });
		} finally {
			cleanup();
		}
	},
});
