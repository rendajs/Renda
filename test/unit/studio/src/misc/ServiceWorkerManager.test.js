import {assertEquals, assertInstanceOf, assertRejects} from "std/testing/asserts.ts";
import {injectMockStudioInstance} from "../../../../../studio/src/studioInstance.js";
import {ServiceWorkerManager} from "../../../../../studio/src/misc/ServiceWorkerManager.js";
import {MemoryStudioFileSystem} from "../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import {TypedMessenger} from "../../../../../src/util/TypedMessenger/TypedMessenger.js";
import {assertSpyCall, assertSpyCalls, mockSessionAsync, spy, stub} from "std/testing/mock.ts";

const SERVICE_WORKER_CLIENT_ID = "service worker client id";

/**
 * @typedef BasicTestContext
 * @property {import("../../../../../studio/sw.js").TypedMessengerWithTypes} messenger
 * @property {import("std/testing/mock.ts").Spy<import("../../../../../studio/src/tasks/TaskManager.js").TaskManager, [taskType: string, taskConfig: unknown, options?: import("../../../../../studio/src/tasks/TaskManager.js").RunTaskOptions | undefined]>} runTaskSpy
 * @property {() => void} fireControllerChange
 * @property {() => void} fireUnload
 * @property {() => void} fireTimeout
 * @property {() => void} createInstallingWorker
 * @property {() => void} promoteInstallingWorker
 * @property {() => void} promoteWaitingWorker
 * @property {(now: number) => void} setPreformanceNow Sets the return value for `preformance.now()`
 * @property {(pending: boolean) => void} setUpdatePromisePending
 * @property {() => Promise<void>} waitForMicrotasks
 * @property {import("std/testing/mock.ts").Stub<Location, [], void>} reloadSpy
 * @property {import("std/testing/mock.ts").Spy<any, [], void>} registerClientSpy
 * @property {import("std/testing/mock.ts").Spy<any, [], void>} unregisterClientSpy
 * @property {import("std/testing/mock.ts").Spy<any, [], Promise<void>>} skipWaitingSpy
 */

/**
 * @param {object} options
 * @param {(ctx: BasicTestContext) => Promise<void>} options.fn
 * @param {boolean} [options.supported]
 * @param {import("../../../../../studio/src/tasks/task/Task.js").RunTaskReturn} [options.runTaskResult]
 */
async function basicTest({
	supported = true,
	runTaskResult,
	fn,
}) {
	const originalNavigatorServiceWorker = navigator.serviceWorker;
	const originalLocation = window.location;
	const originalServiceWorkerConstructor = globalThis.ServiceWorker;
	const originalAddEventListener = window.addEventListener.bind(window);
	const originalSetTimeout = globalThis.setTimeout;
	let performanceNowReturnValue = 0;
	const performanceNowStub = stub(performance, "now", () => performanceNowReturnValue);

	try {
		const mockFileSystem = new MemoryStudioFileSystem();
		await mockFileSystem.writeText(["path", "to", "file"], "hello file");

		const mockStudio = /** @type {import("../../../../../studio/src/Studio.js").Studio} */ ({
			projectManager: {
				currentProjectFileSystem: /** @type {import("../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystem} */ (mockFileSystem),
			},
			taskManager: {
				/**
				 * @template {string} T
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
		/** @type {Set<() => void>} */
		const onControllerChangeListeners = new Set();
		/** @type {Set<() => void>} */
		const unloadListeners = new Set();
		/** @type {Set<() => void>} */
		const updateFoundListeners = new Set();

		// We only create a single TypedMessenger and set of handlers.
		// But in the real world we will end up with multiple messengers and handlers in cases where
		// multiple service workers are created.
		// For now any messages are always passed on to the `activeWorker`.
		// And any responses will appear to be coming from the active worker as well.
		/** @type {import("../../../../../studio/sw.js").TypedMessengerWithTypes} */
		const messenger = new TypedMessenger();
		/** @type {import("../../../../../studio/sw.js").ServiceWorkerMessageHandlers} */
		const handlers = {
			registerClient() {},
			unregisterClient() {},
			requestClientId() {
				return SERVICE_WORKER_CLIENT_ID;
			},
			async skipWaiting() {},
		};
		const registerClientSpy = spy(handlers, "registerClient");
		const unregisterClientSpy = spy(handlers, "unregisterClient");
		const skipWaitingSpy = spy(handlers, "skipWaiting");
		messenger.setResponseHandlers(handlers);
		messenger.setSendHandler(data => {
			const event = /** @type {MessageEvent} */ ({
				data: data.sendData,
				source: activeWorker,
			});
			onMessageListeners.forEach(listener => listener(event));
		});

		class MockServiceWorker {
			/** @type {Set<() => void>} */
			#onStateChangeListeners = new Set();

			/**
			 * @param {any} message
			 */
			postMessage(message) {
				messenger.handleReceivedMessage(message);
			}

			/**
			 * @param {string} type
			 * @param {() => void} listener
			 */
			addEventListener(type, listener) {
				if (type == "statechange") {
					this.#onStateChangeListeners.add(listener);
				} else {
					throw new Error("Unexpected event type: " + type);
				}
			}

			fireStateChange() {
				this.#onStateChangeListeners.forEach(cb => cb());
			}
		}

		globalThis.ServiceWorker = /** @type {new () => ServiceWorker} */ (/** @type {unknown} */ (MockServiceWorker));

		/** @type {MockServiceWorker?} */
		let installingWorker;
		/** @type {MockServiceWorker?} */
		let waitingWorker;
		/** @type {MockServiceWorker?} */
		let activeWorker = new MockServiceWorker();

		let updatePromise = Promise.resolve();
		let resolveUpdatePromise = () => {};

		const mockRegistration = /** @type {ServiceWorkerRegistration} */ ({
			get installing() {
				return installingWorker;
			},
			get waiting() {
				return waitingWorker;
			},
			get active() {
				return activeWorker;
			},
			/**
			 * @param {string} type
			 * @param {() => void} listener
			 */
			addEventListener(type, listener) {
				if (type == "updatefound") {
					updateFoundListeners.add(listener);
				} else {
					throw new Error("Unexpected event type: " + type);
				}
			},
			update() {
				return updatePromise;
			},
		});

		// Ideally we'd want to use FakeTime for this, but there's currently a bug that causes `setTimeout` to get unmocked:
		// https://github.com/denoland/deno_std/issues/2349
		// Since ServiceWorkerManager.js only contains a single call to `setTimeout`, we will just mock it ourselves.
		/** @type {Function | ((...args: any[]) => void) | null} */
		let setTimeoutCallback = null;
		globalThis.setTimeout = (cb, delay) => {
			if (typeof cb == "string") {
				throw new Error("assertion failed, cb is not a function");
			}
			setTimeoutCallback = cb;
			return 1;
		};

		if (supported) {
			// @ts-ignore
			navigator.serviceWorker = /** @type {ServiceWorkerContainer} */ ({
				async register(...args) {
					return mockRegistration;
				},
				/**
				 * @param {string} type
				 * @param {(...args: any) => any} listener
				 */
				addEventListener(type, listener) {
					if (type == "message") {
						onMessageListeners.add(listener);
					} else if (type == "controllerchange") {
						onControllerChangeListeners.add(listener);
					} else {
						throw new Error("Unexpected event type: " + type);
					}
				},
				ready: Promise.resolve(mockRegistration),
			});
		} else {
			// @ts-ignore
			delete navigator.serviceWorker;
		}

		window.location = /** @type {Location} */ ({
			href: "https://renda.studio/",
		});

		const reloadSpy = stub(window.location, "reload");

		await mockSessionAsync(async () => {
			stub(window, "addEventListener", (...args) => {
				const [type, listener] = args;
				const castType = /** @type {string} */ (type);
				if (castType == "unload") {
					unloadListeners.add(/** @type {() => void} */ (listener));
				} else {
					originalAddEventListener(...args);
				}
			});

			await fn({
				messenger,
				runTaskSpy,
				reloadSpy,
				registerClientSpy,
				unregisterClientSpy,
				skipWaitingSpy,
				fireControllerChange() {
					onControllerChangeListeners.forEach(cb => cb());
				},
				fireUnload() {
					unloadListeners.forEach(cb => cb());
				},
				fireTimeout() {
					if (!setTimeoutCallback) {
						throw new Error("setTimeout has not been called");
					}
					setTimeoutCallback();
				},
				setPreformanceNow(now) {
					performanceNowReturnValue = now;
				},
				createInstallingWorker() {
					installingWorker = new MockServiceWorker();
					updateFoundListeners.forEach(cb => cb());
				},
				promoteInstallingWorker() {
					if (!installingWorker) {
						throw new Error("no installing worker");
					}
					waitingWorker = installingWorker;
					installingWorker = null;
					waitingWorker.fireStateChange();
				},
				promoteWaitingWorker() {
					if (!waitingWorker) {
						throw new Error("No waiting worker");
					}
					activeWorker = waitingWorker;
					waitingWorker = null;
					activeWorker.fireStateChange();
				},
				setUpdatePromisePending(pending) {
					if (pending) {
						updatePromise = new Promise(r => {
							resolveUpdatePromise = r;
						});
					} else {
						resolveUpdatePromise();
					}
				},
				waitForMicrotasks() {
					return new Promise(r => originalSetTimeout(r, 0));
				},
			});
		})();
	} finally {
		// @ts-ignore
		navigator.serviceWorker = originalNavigatorServiceWorker;
		window.location = originalLocation;
		globalThis.ServiceWorker = originalServiceWorkerConstructor;
		window.addEventListener = originalAddEventListener;
		globalThis.setTimeout = originalSetTimeout;
		performanceNowStub.restore();
		injectMockStudioInstance(null);
	}
}

Deno.test({
	name: "Client is registered when initiated",
	async fn() {
		await basicTest({
			async fn(ctx) {
				const manager = new ServiceWorkerManager();
				await manager.init();

				assertSpyCalls(ctx.registerClientSpy, 1);
			},
		});
	},
});

Deno.test({
	name: "Serviceworker unsupported",
	async fn() {
		await basicTest({
			supported: false,
			async fn(ctx) {
				const manager = new ServiceWorkerManager();
				await manager.init();

				assertSpyCalls(ctx.registerClientSpy, 0);

				await assertRejects(async () => {
					await manager.getClientId();
				}, Error, "Assertion failed, no active service worker exists.");
			},
		});
	},
});

Deno.test({
	name: "Client is unregistered when the page is unloaded",
	async fn() {
		await basicTest({
			async fn(ctx) {
				const manager = new ServiceWorkerManager();
				await manager.init();

				ctx.fireUnload();
				assertSpyCalls(ctx.unregisterClientSpy, 1);
			},
		});
	},
});

Deno.test({
	name: "getProjectFile message",
	async fn() {
		await basicTest({
			async fn(ctx) {
				const manager = new ServiceWorkerManager();
				await manager.init();

				const result = await ctx.messenger.send.getProjectFile("path/to/file");
				assertInstanceOf(result, File);
				const textResult = await result.text();
				assertEquals(textResult, "hello file");
			},
		});
	},
});

Deno.test({
	name: "getGeneratedServices message",
	async fn() {
		await basicTest({
			async fn(ctx) {
				const manager = new ServiceWorkerManager();
				await manager.init();

				const result = await ctx.messenger.send.getGeneratedServices();
				assertEquals(result, "hello services");
			},

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
		await basicTest({
			async fn(ctx) {
				const manager = new ServiceWorkerManager();
				await manager.init();

				const result = await ctx.messenger.send.getGeneratedHtml("path/to/script.js");
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
			},
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

Deno.test({
	name: "Changing open tab count fires events and updates state",
	async fn() {
		await basicTest({
			async fn(ctx) {
				const manager = new ServiceWorkerManager();
				await manager.init();

				const onChangeSpy = spy();
				manager.onOpenTabCountChange(onChangeSpy);

				await ctx.messenger.send.openTabCountChanged(2);
				assertSpyCalls(onChangeSpy, 1);
				assertEquals(manager.openTabCount, 2);

				await ctx.messenger.send.openTabCountChanged(4);
				assertSpyCalls(onChangeSpy, 2);
				assertEquals(manager.openTabCount, 4);

				manager.removeOnOpenTabCountChange(onChangeSpy);
				await ctx.messenger.send.openTabCountChanged(6);
				assertSpyCalls(onChangeSpy, 2);
				assertEquals(manager.openTabCount, 6);
			},
		});
	},
});

Deno.test({
	name: "getClientId() returns the client id from the service worker",
	async fn() {
		await basicTest({
			async fn() {
				const manager = new ServiceWorkerManager();
				await manager.init();

				const result = await manager.getClientId();
				assertEquals(result, SERVICE_WORKER_CLIENT_ID);
			},
		});
	},
});

Deno.test({
	name: "installingState flow when checking for udpates",
	async fn() {
		await basicTest({
			async fn(ctx) {
				const manager = new ServiceWorkerManager();
				assertEquals(manager.installingState, "idle");
				const onChangeSpy = spy();
				manager.onInstallingStateChange(onChangeSpy);
				const removedOnChangeSpy = spy();
				manager.onInstallingStateChange(removedOnChangeSpy);

				ctx.setUpdatePromisePending(true);
				const initPromise = manager.init();

				await ctx.waitForMicrotasks();

				assertSpyCalls(onChangeSpy, 1);
				assertSpyCalls(removedOnChangeSpy, 1);
				assertEquals(manager.installingState, "checking-for-updates");

				manager.removeOnInstallingStateChange(removedOnChangeSpy);

				ctx.setUpdatePromisePending(false);
				await ctx.waitForMicrotasks();

				assertSpyCalls(onChangeSpy, 2);
				assertSpyCalls(removedOnChangeSpy, 1);
				assertEquals(manager.installingState, "up-to-date");
				await initPromise;

				ctx.setPreformanceNow(40_000);
				ctx.fireTimeout();
				assertSpyCalls(onChangeSpy, 3);
				assertEquals(manager.installingState, "idle");

				ctx.setUpdatePromisePending(true);
				const checkForUpdatesPromise = manager.checkForUpdates();
				await ctx.waitForMicrotasks();
				assertSpyCalls(onChangeSpy, 4);
				assertEquals(manager.installingState, "checking-for-updates");

				ctx.createInstallingWorker();
				ctx.setUpdatePromisePending(false);
				await ctx.waitForMicrotasks();
				await checkForUpdatesPromise;
				assertSpyCalls(onChangeSpy, 5);
				assertEquals(manager.installingState, "installing");

				ctx.promoteInstallingWorker();
				assertSpyCalls(onChangeSpy, 6);
				assertEquals(manager.installingState, "waiting-for-restart");

				assertSpyCalls(ctx.skipWaitingSpy, 0);
				// We can't await the `restartClients` promise because a message is being sent to the waiting worker
				// the mocked service worker only responds from the active worker so this promise will stay pending
				manager.restartClients();
				assertSpyCalls(onChangeSpy, 7);
				assertEquals(manager.installingState, "restarting");
				assertSpyCalls(ctx.skipWaitingSpy, 1);
			},
		});
	},
});

Deno.test({
	name: "Page is reloaded when the controller changes",
	async fn() {
		await basicTest({
			async fn(ctx) {
				const manager = new ServiceWorkerManager();
				await manager.init();

				ctx.fireControllerChange();
				assertSpyCalls(ctx.reloadSpy, 1);
			},
		});
	},
});
