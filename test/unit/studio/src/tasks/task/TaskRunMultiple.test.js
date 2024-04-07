import { assertEquals } from "std/testing/asserts.ts";
import { assertSpyCall, assertSpyCalls, spy } from "std/testing/mock.ts";
import "../../../shared/initializeStudio.js";
import { TaskRunMultiple } from "../../../../../../studio/src/tasks/task/TaskRunMultiple.js";
import { waitForMicrotasks } from "../../../../../../src/util/waitForMicroTasks.js";

Deno.test({
	name: "transformUiToAssetData()",
	fn() {
		/** @type {{input: Parameters<TaskRunMultiple.transformUiToAssetData>[0], expected: ReturnType<TaskRunMultiple.transformUiToAssetData>}[]} */
		const tests = [
			{
				input: undefined,
				expected: undefined,
			},
			{
				input: {
					// @ts-expect-error Remove this when #118 is fixed
					taskGroup: {
						parallel: false,
					},
				},
				expected: {
					taskGroup: {
						parallel: false,
					},
				},
			},
			{
				input: {
					// @ts-expect-error Remove this when #118 is fixed
					taskGroup: {
						subTasks: [
							{
								task: "uuid",
							},
						],
					},
				},
				expected: {
					taskGroup: {
						tasks: ["uuid"],
					},
				},
			},
			{
				input: {
					// @ts-expect-error Remove this when #118 is fixed
					taskGroup: {
						task: "uuid",
					},
				},
				expected: {
					taskGroup: {
						tasks: ["uuid"],
					},
				},
			},
		];

		for (const { input, expected } of tests) {
			const actual = TaskRunMultiple.transformUiToAssetData(input);
			assertEquals(actual, expected);
		}
	},
});

Deno.test({
	name: "transformAssetToUiData",
	fn() {
		/** @type {{input: Parameters<TaskRunMultiple.transformAssetToUiData>[0], expected: ReturnType<TaskRunMultiple.transformAssetToUiData>}[]} */
		const tests = [
			{
				input: {
					taskGroup: {
						parallel: true,
						tasks: [
							"uuid",
							{
								parallel: false,
								tasks: [
									"sub uuid",
									{
										tasks: [],
									},
								],
							},
							"uuid2",
						],
					},
				},
				expected: {
					// @ts-expect-error Remove this when #118 is fixed
					taskGroup: {
						parallel: true,
						subTasks: [
							{
								task: "uuid",
							},
							{
								parallel: false,
								subTasks: [
									{
										task: "sub uuid",
									},
									{},
								],
							},
							{
								task: "uuid2",
							},
						],
					},
				},
			},
		];

		for (const { input, expected } of tests) {
			const actual = TaskRunMultiple.transformAssetToUiData(input);
			assertEquals(actual, expected);
		}
	},
});

/**
 * @param {object} options
 * @param {import("../../../../../../studio/src/tasks/task/TaskRunMultiple.js").TaskRunMultipleConfig} options.config
 */
function basicSetupForRunTask({
	config,
}) {
	const mockStudio = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({});
	const task = new TaskRunMultiple(mockStudio);

	/** @type {(() => void)[]} */
	const dependencyResolveCallbacks = [];

	/**
	 * @type {import("std/testing/mock.ts").Spy}
	 */
	const runDependencyTaskAssetSpy = spy(async (uuid) => {
		/** @type {Promise<void>} */
		const promise = new Promise((cb) => dependencyResolveCallbacks.push(cb));
		await promise;
	});

	const runTaskPromise = task.runTask({
		config,
		allowDiskWrites: false,
		async readAssetFromPath() {
			throw new Error("not implemented");
		},
		async readAssetFromUuid() {
			throw new Error("not implemented");
		},
		runDependencyTaskAsset: runDependencyTaskAssetSpy,
		async runChildTask() {
			throw new Error("not implemented");
		},
	});
	let runTaskPromiseResolved = false;
	(async () => {
		await runTaskPromise;
		runTaskPromiseResolved = true;
	})();

	async function resolveNextDependencies(count = 1) {
		for (let i = 0; i < count; i++) {
			const cb = dependencyResolveCallbacks.shift();
			if (!cb) throw new Error("No more dependency promises left to resolve");
			cb();
		}
		await waitForMicrotasks();
	}

	return {
		runDependencyTaskAssetSpy,
		runTaskPromise,
		resolveNextDependencies,
		/**
		 * First asserts that the task promise isn't resolved yet. Then resolves
		 * the specified amount of remaining dependencies. And finally asserts
		 * that the task promise is now resolved.
		 */
		async assertTaskResolving(resolveDependenciesCount = 1) {
			assertEquals(runTaskPromiseResolved, false);
			await resolveNextDependencies(resolveDependenciesCount);
			assertEquals(runTaskPromiseResolved, true);
			await runTaskPromise;
		},
	};
}

Deno.test({
	name: "runTask single array of parallel tasks",
	async fn() {
		const { runDependencyTaskAssetSpy, assertTaskResolving } = basicSetupForRunTask({
			config: {
				taskGroup: {
					parallel: true,
					tasks: [
						"task1",
						"task2",
						"task3",
					],
				},
			},
		});

		assertSpyCalls(runDependencyTaskAssetSpy, 3);
		assertSpyCall(runDependencyTaskAssetSpy, 0, {
			args: ["task1"],
		});
		assertSpyCall(runDependencyTaskAssetSpy, 1, {
			args: ["task2"],
		});
		assertSpyCall(runDependencyTaskAssetSpy, 2, {
			args: ["task3"],
		});

		await assertTaskResolving(3);
	},
});

Deno.test({
	name: "runTask single array of non-parallel tasks",
	async fn() {
		const { runDependencyTaskAssetSpy, assertTaskResolving, resolveNextDependencies } = basicSetupForRunTask({
			config: {
				taskGroup: {
					parallel: false,
					tasks: [
						"task1",
						"task2",
						"task3",
					],
				},
			},
		});

		assertSpyCalls(runDependencyTaskAssetSpy, 1);
		assertSpyCall(runDependencyTaskAssetSpy, 0, {
			args: ["task1"],
		});

		await resolveNextDependencies();
		assertSpyCalls(runDependencyTaskAssetSpy, 2);
		assertSpyCall(runDependencyTaskAssetSpy, 1, {
			args: ["task2"],
		});

		await resolveNextDependencies();
		assertSpyCalls(runDependencyTaskAssetSpy, 3);
		assertSpyCall(runDependencyTaskAssetSpy, 2, {
			args: ["task3"],
		});

		await assertTaskResolving();
	},
});

Deno.test({
	name: "tasks run in parallel by default",
	async fn() {
		const { runDependencyTaskAssetSpy, assertTaskResolving } = basicSetupForRunTask({
			config: {
				taskGroup: {
					tasks: [
						"task1",
						"task2",
						"task3",
					],
				},
			},
		});

		assertSpyCalls(runDependencyTaskAssetSpy, 3);
		assertSpyCall(runDependencyTaskAssetSpy, 0, {
			args: ["task1"],
		});
		assertSpyCall(runDependencyTaskAssetSpy, 1, {
			args: ["task2"],
		});
		assertSpyCall(runDependencyTaskAssetSpy, 2, {
			args: ["task3"],
		});

		await assertTaskResolving(3);
	},
});

Deno.test({
	name: "several nested tasks",
	async fn() {
		const { runDependencyTaskAssetSpy, assertTaskResolving, resolveNextDependencies } = basicSetupForRunTask({
			config: {
				taskGroup: {
					tasks: [
						"task1",
						{
							parallel: false,
							tasks: [
								"task2a",
								"task2b",
								"task2c",
								{
									tasks: [
										"task2ci",
										"task2cii",
										"task2ciii",
									],
								},
							],
						},
						"task3",
					],
				},
			},
		});

		assertSpyCalls(runDependencyTaskAssetSpy, 3);
		assertSpyCall(runDependencyTaskAssetSpy, 0, {
			args: ["task1"],
		});
		assertSpyCall(runDependencyTaskAssetSpy, 1, {
			args: ["task2a"],
		});
		assertSpyCall(runDependencyTaskAssetSpy, 2, {
			args: ["task3"],
		});

		await resolveNextDependencies(3);
		assertSpyCalls(runDependencyTaskAssetSpy, 4);
		assertSpyCall(runDependencyTaskAssetSpy, 3, {
			args: ["task2b"],
		});

		await resolveNextDependencies();
		assertSpyCalls(runDependencyTaskAssetSpy, 5);
		assertSpyCall(runDependencyTaskAssetSpy, 4, {
			args: ["task2c"],
		});

		await resolveNextDependencies();
		assertSpyCalls(runDependencyTaskAssetSpy, 8);
		assertSpyCall(runDependencyTaskAssetSpy, 5, {
			args: ["task2ci"],
		});
		assertSpyCall(runDependencyTaskAssetSpy, 6, {
			args: ["task2cii"],
		});
		assertSpyCall(runDependencyTaskAssetSpy, 7, {
			args: ["task2ciii"],
		});

		await assertTaskResolving(3);
	},
});
