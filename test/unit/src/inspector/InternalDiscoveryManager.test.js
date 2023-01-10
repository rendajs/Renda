import {InternalDiscoveryManager} from "../../../../src/mod.js";
import {assertSpyCall, assertSpyCalls, mockSessionAsync, spy, stub} from "std/testing/mock.ts";
import {initializeIframe} from "../../../../editor/src/network/editorConnections/internalDiscovery/internalDiscoveryMain.js";
import {initializeWorker} from "../../../../editor/src/network/editorConnections/internalDiscovery/internalDiscoveryWorkerMain.js";
import {assertEquals, assertInstanceOf} from "std/testing/asserts.ts";
import {waitForMicrotasks} from "../../shared/waitForMicroTasks.js";

/**
 * Creates an InternalDiscoveryManager, along with a mocked iframe and SharedWorker.
 * @param {Object} options
 * @param {() => Promise<void>} options.fn The test function to run
 */
async function basicSetup({
	fn,
}) {
	const previousDocument = globalThis.document;
	const previousSharedWorker = globalThis.SharedWorker;
	const originalAddEventListener = window.addEventListener.bind(window);

	/** @type {Set<MessagePort>} */
	const createdMessagePorts = new Set();

	try {
		/** @type {Window[]} */
		const initializedIframeWindows = [];

		/** @typedef {(e: MessageEvent) => void} MessageEventListener */
		/** @type {Set<MessageEventListener>} */
		const parentMessageEventListeners = new Set();
		/**
		 * @param {MessageEventSource} messageEventSource
		 */
		function createIframeWithWindow(messageEventSource) {
			/** @type {Set<MessageEventListener>} */
			const messageListeners = new Set();
			const mockWindow = /** @type {Window} */ ({
				/**
				 * @param {Parameters<typeof originalAddEventListener>} args
				 */
				addEventListener(...args) {
					const [type, listener] = args;
					if (type == "message") {
						messageListeners.add(listener);
					} else {
						originalAddEventListener(...args);
					}
				},
				parent: {
					postMessage(message, options) {
						parentMessageEventListeners.forEach(listener => {
							const event = /** @type {MessageEvent} */ ({
								data: message,
								source: messageEventSource,
							});
							listener(event);
						});
					},
				},
			});

			// make sure the iframe is loaded in the next event loop to give the
			// parent window a chance to setup the InternalDiscoveryManager class
			setTimeout(() => {
				initializeIframe(mockWindow);
				initializedIframeWindows.push(mockWindow);
			}, 0);
			return {
				/**
				 * @param {any} message
				 */
				createMessageEvent(message) {
					messageListeners.forEach(listener => {
						const event = new MessageEvent("message", {
							data: message,
						});
						listener(event);
					});
				},
			};
		}
		globalThis.document = /** @type {Document} */ ({
			/**
			 * @param {"iframe"} tagName
			 */
			createElement(tagName) {
				if (tagName != "iframe") {
					throw new Error("Unexpected tag name");
				}

				const contentWindow = /** @type {Window} */ ({
					postMessage(message, options) {
						createMessageEvent(message);
					},
				});
				const {createMessageEvent} = createIframeWithWindow(contentWindow);

				return /** @type {HTMLIFrameElement} */ ({
					style: {},
					contentWindow,
				});
			},
			body: {
				appendChild(child) {},
			},
		});

		/** @type {Set<MessageEventListener>} */
		const sharedWorkerConnectCallbacks = new Set();

		const mockWorkerGlobal = /** @type {typeof globalThis} */ ({
			/**
			 * @param {Parameters<typeof originalAddEventListener>} args
			 */
			addEventListener(...args) {
				const [type, listener] = args;
				const castType = /** @type {string} */ (type);
				if (castType == "connect") {
					sharedWorkerConnectCallbacks.add(listener);
				} else {
					originalAddEventListener(...args);
				}
			},
		});
		initializeWorker(mockWorkerGlobal);

		class MockSharedWorker {
			constructor() {
				const sharedWorkerChannel = new MessageChannel();
				createdMessagePorts.add(sharedWorkerChannel.port1);
				createdMessagePorts.add(sharedWorkerChannel.port2);
				this.port = sharedWorkerChannel.port1;

				sharedWorkerConnectCallbacks.forEach(listener => {
					const mockEvent = /** @type {MessageEvent} */ ({
						ports: /** @type {readonly MessagePort[]} */ ([sharedWorkerChannel.port2]),
					});
					listener(mockEvent);
				});
			}
		}
		globalThis.SharedWorker = /** @type {typeof SharedWorker} */ (/** @type {unknown} */ (MockSharedWorker));

		await mockSessionAsync(async () => {
			stub(window, "addEventListener", (...args) => {
				const [type, listener] = args;
				const castType = /** @type {string} */ (type);
				if (type == "message") {
					parentMessageEventListeners.add(listener);
				} else if (castType == "unload") {
					// The Deno test runner fires the unload event after the test is done
					// ideally we'd write a test for this case but instead I'll just ignore this for now.
				} else {
					originalAddEventListener(...args);
				}
			});

			await fn();
		})();
	} finally {
		globalThis.document = previousDocument;
		globalThis.SharedWorker = previousSharedWorker;

		createdMessagePorts.forEach(p => p.close());
	}
}

Deno.test({
	name: "available client updates are sent correctly",
	async fn() {
		await basicSetup({
			async fn() {
				const manager1 = new InternalDiscoveryManager();
				/** @type {import("../../../../src/Inspector/InternalDiscoveryManager.js").OnAvailableClientUpdateCallback} */
				const spyFn = () => {};
				const availableChangedSpy1 = spy(spyFn);
				manager1.onAvailableClientUpdated(availableChangedSpy1);
				await manager1.registerClient("inspector");

				const manager2 = new InternalDiscoveryManager();
				await manager2.registerClient("editor");

				assertSpyCalls(availableChangedSpy1, 1);
				const event1 = availableChangedSpy1.calls[0].args[0];
				const manager2ClientId = event1.clientId;
				assertEquals(event1, {
					clientId: manager2ClientId,
					clientType: "editor",
					projectMetaData: null,
				});

				await manager2.sendProjectMetaData({
					name: "project name 1",
					uuid: "project uuid 1",
				});
				assertSpyCalls(availableChangedSpy1, 2);
				assertSpyCall(availableChangedSpy1, 1, {
					args: [
						{
							clientId: manager2ClientId,
							projectMetaData: {
								name: "project name 1",
								uuid: "project uuid 1",
							},
						},
					],
				});

				const manager3 = new InternalDiscoveryManager();
				const availableChangedSpy3 = spy(spyFn);
				manager3.onAvailableClientUpdated(availableChangedSpy3);
				await manager3.registerClient("inspector");

				assertSpyCalls(availableChangedSpy3, 2);
				const manager1ClientId = availableChangedSpy3.calls[0].args[0].clientId;
				assertSpyCall(availableChangedSpy3, 0, {
					args: [
						{
							clientId: manager1ClientId,
							clientType: "inspector",
							projectMetaData: null,
						},
					],
				});
				assertSpyCall(availableChangedSpy3, 1, {
					args: [
						{
							clientId: manager2ClientId,
							clientType: "editor",
							projectMetaData: {
								name: "project name 1",
								uuid: "project uuid 1",
							},
						},
					],
				});

				assertSpyCalls(availableChangedSpy1, 3);
				const event3 = availableChangedSpy1.calls[2].args[0];
				const manager3ClientId = event3.clientId;
				assertEquals(event3, {
					clientId: manager3ClientId,
					clientType: "inspector",
					projectMetaData: null,
				});

				await manager2.destructor();
				await waitForMicrotasks();
				assertSpyCalls(availableChangedSpy1, 4);
				assertSpyCall(availableChangedSpy1, 3, {
					args: [
						{
							clientId: manager2ClientId,
							deleted: true,
							projectMetaData: null,
						},
					],
				});

				assertSpyCalls(availableChangedSpy3, 3);
				assertSpyCall(availableChangedSpy3, 2, {
					args: [
						{
							clientId: manager2ClientId,
							deleted: true,
							projectMetaData: null,
						},
					],
				});

				await manager3.destructor();
				await waitForMicrotasks();
				assertSpyCalls(availableChangedSpy1, 5);
				assertSpyCall(availableChangedSpy1, 4, {
					args: [
						{
							clientId: manager3ClientId,
							deleted: true,
							projectMetaData: null,
						},
					],
				});
			},
		});
	},
});

Deno.test({
	name: "connecting two clients",
	async fn() {
		await basicSetup({
			async fn() {
				/** @type {import("../../../../src/Inspector/InternalDiscoveryManager.js").OnConnectionCreatedCallback} */
				const onCreatedSpyFn = () => {};
				/** @type {import("../../../../src/Inspector/InternalDiscoveryManager.js").OnAvailableClientUpdateCallback} */
				const onAvailableSpyFn = () => {};

				const manager1 = new InternalDiscoveryManager();
				const manager1ConnectionSpy = spy(onCreatedSpyFn);
				manager1.onConnectionCreated(manager1ConnectionSpy);
				const manager1AvailableSpy = spy(onAvailableSpyFn);
				manager1.onAvailableClientUpdated(manager1AvailableSpy);
				await manager1.registerClient("editor");

				const manager2 = new InternalDiscoveryManager();
				const manager2ConnectionSpy = spy(onCreatedSpyFn);
				manager2.onConnectionCreated(manager2ConnectionSpy);
				const manager2AvailableSpy = spy(onAvailableSpyFn);
				manager2.onAvailableClientUpdated(manager2AvailableSpy);
				await manager2.registerClient("inspector");

				assertSpyCalls(manager1AvailableSpy, 1);
				const manager2ClientId = manager1AvailableSpy.calls[0].args[0].clientId;
				assertSpyCalls(manager2AvailableSpy, 1);
				const manager1ClientId = manager2AvailableSpy.calls[0].args[0].clientId;
				await manager1.requestConnection(manager2ClientId);

				assertSpyCalls(manager1ConnectionSpy, 1);
				assertEquals(manager1ConnectionSpy.calls[0].args[0], manager2ClientId);
				const manager1Port = manager1ConnectionSpy.calls[0].args[1];
				assertInstanceOf(manager1Port, MessagePort);

				assertSpyCalls(manager2ConnectionSpy, 1);
				assertEquals(manager2ConnectionSpy.calls[0].args[0], manager1ClientId);
				const manager2Port = manager2ConnectionSpy.calls[0].args[1];
				assertInstanceOf(manager2Port, MessagePort);

				// Check if the two ports are connected
				/** @type {(e: MessageEvent) => void} */
				const messageSpyFn = () => {};
				const messageSpy1 = spy(messageSpyFn);
				const messageSpy2 = spy(messageSpyFn);
				manager1Port.addEventListener("message", messageSpy1);
				manager2Port.addEventListener("message", messageSpy2);
				manager1Port.start();
				manager2Port.start();
				manager1Port.postMessage("ping");
				manager2Port.postMessage("pong");

				await waitForMicrotasks();

				assertSpyCalls(messageSpy1, 1);
				assertSpyCalls(messageSpy2, 1);
				assertEquals(messageSpy1.calls[0].args[0].data, "pong");
				assertEquals(messageSpy2.calls[0].args[0].data, "ping");

				manager1Port.close();
				manager2Port.close();
			},
		});
	},
});
