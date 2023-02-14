import {assertEquals, assertInstanceOf} from "std/testing/asserts.ts";
import {injectMockStudioInstance} from "../../../../../studio/src/studioInstance.js";
import {ServiceWorkerManager} from "../../../../../studio/src/misc/ServiceWorkerManager.js";
import {MemoryStudioFileSystem} from "../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import {TypedMessenger} from "../../../../../src/util/TypedMessenger.js";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";

/**
 * @typedef BasicTestContext
 * @property {import("../../../../../studio/sw.js").TypedMessengerWithTypes} messenger
 * @property {import("std/testing/mock.ts").Spy<import("../../../../../studio/src/tasks/TaskManager.js").TaskManager, [taskType: string, taskConfig: unknown, options?: import("../../../../../studio/src/tasks/TaskManager.js").RunTaskOptions | undefined]>} runTaskSpy
 */

/**
 * @param {(ctx: BasicTestContext) => Promise<void>} fn
 * @param {object} options
 * @param {import("../../../../../studio/src/tasks/task/Task.js").RunTaskReturn} [options.runTaskResult]
 */
async function basicTest(fn, {
	runTaskResult,
} = {}) {
	const previousNavigatorServiceWorker = navigator.serviceWorker;
	const previousLocation = window.location;
	try {
		const mockFileSystem = new MemoryStudioFileSystem();
		await mockFileSystem.writeText(["path", "to", "file"], "hello file");

		const mockStudio = /** @type {import("../../../../../studio/src/Studio.js").Studio} */ ({
			projectManager: {
				currentProjectFileSystem: /** @type {import("../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystem} */ (mockFileSystem),
			},
			taskManager: {
				/**
				 * @template T
				 * @param {T} taskType
				 */
				async runTask(taskType, taskConfig, options) {
					if (!runTaskResult) {
						throw new Error("Run task was called but no mocked result was set");
					}
					return /** @type {import("../../../../../studio/src/tasks/TaskManager.js").GetExpectedTaskReturn<T>} */ (runTaskResult);
				},
			},
		});
		injectMockStudioInstance(mockStudio);

		const runTaskSpy = spy(mockStudio.taskManager, "runTask");

		/** @typedef {(e: MessageEvent) => void} OnMessageListener */
		/** @type {Set<OnMessageListener>} */
		const onMessageListeners = new Set();

		/** @type {import("../../../../../studio/sw.js").TypedMessengerWithTypes} */
		const messenger = new TypedMessenger();
		messenger.setSendHandler(data => {
			const event = /** @type {MessageEvent} */ ({
				data: data.sendData,
			});
			onMessageListeners.forEach(listener => listener(event));
		});

		const mockServiceWorker = /** @type {ServiceWorker} */ ({
			postMessage(message) {
				messenger.handleReceivedMessage(message);
			},
		});

		const mockRegistration = /** @type {ServiceWorkerRegistration} */ ({
			active: mockServiceWorker,
		});

		// @ts-ignore
		navigator.serviceWorker = /** @type {ServiceWorkerContainer} */ ({
			async register(...args) {
				return mockRegistration;
			},
			/**
			 * @param {string} type
			 * @param {OnMessageListener} listener
			 */
			addEventListener(type, listener) {
				if (type == "message") {
					onMessageListeners.add(listener);
				} else {
					throw new Error("Unexpected event type: " + type);
				}
			},
			ready: Promise.resolve(mockRegistration),
		});

		window.location = /** @type {Location} */ ({
			href: "https://renda.studio/",
		});

		await fn({messenger, runTaskSpy});
	} finally {
		// @ts-ignore
		navigator.serviceWorker = previousNavigatorServiceWorker;
		window.location = previousLocation;
		injectMockStudioInstance(null);
	}
}

Deno.test({
	name: "getProjectFile message",
	async fn() {
		await basicTest(async ctx => {
			const manager = new ServiceWorkerManager();
			await manager.init();

			const result = await ctx.messenger.send("getProjectFile", "path/to/file");
			assertInstanceOf(result, File);
			const textResult = await result.text();
			assertEquals(textResult, "hello file");
		});
	},
});

Deno.test({
	name: "getGeneratedServices message",
	async fn() {
		await basicTest(async ctx => {
			const manager = new ServiceWorkerManager();
			await manager.init();

			const result = await ctx.messenger.send("getGeneratedServices");
			assertEquals(result, "hello services");
		}, {
			runTaskResult: {
				writeAssets: [
					{
						fileData: "hello services",
						path: ["path", "to", "write", "file"],
					},
				],
			},
		});
	},
});

Deno.test({
	name: "getGeneratedHtml message",
	async fn() {
		await basicTest(async ctx => {
			const manager = new ServiceWorkerManager();
			await manager.init();

			const result = await ctx.messenger.send("getGeneratedHtml", "path/to/script.js");
			assertEquals(result, "hello html");

			assertSpyCalls(ctx.runTaskSpy, 1);
			assertSpyCall(ctx.runTaskSpy, 0, {
				args: [
					"renda:generateHtml",
					{
						outputLocation: ["index.html"],
						replacements: [
							{
								find: "HTML_SCRIPT_SRC",
								replace: "path/to/script.js",
							},
							{
								find: "RENDA_IMPORT_MAP_TAG",
								replace: `<script type="importmap">{"imports":{"renda":"https://renda.studio/src/mod.js","renda:services":"./services.js"}}</script>`,
							},
						],
						template: "264a38b9-4e43-4261-b57d-28a778a12dd9",
					},
				],
			});
		}, {
			runTaskResult: {
				writeAssets: [
					{
						fileData: "hello html",
						path: ["path", "to", "write", "file"],
					},
				],
			},
		});
	},
});
