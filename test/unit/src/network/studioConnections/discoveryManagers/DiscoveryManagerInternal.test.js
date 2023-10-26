import {DiscoveryManagerInternal} from "../../../../../../src/network/studioConnections/discoveryManagers/DiscoveryManagerInternal.js";
import {assertSpyCall, assertSpyCalls, mockSessionAsync, spy, stub} from "std/testing/mock.ts";
import {FakeTime} from "std/testing/time.ts";
import {initializeIframe} from "../../../../../../studio/src/network/studioConnections/internalDiscovery/internalDiscoveryIframeMain.js";
import {initializeWorker} from "../../../../../../studio/src/network/studioConnections/internalDiscovery/internalDiscoveryWorkerMain.js";
import {AssertionError, assertEquals, assertExists, assertInstanceOf, assertRejects} from "std/testing/asserts.ts";
import {waitForMicrotasks} from "../../../../shared/waitForMicroTasks.js";
import {TypedMessenger} from "../../../../../../src/util/TypedMessenger.js";
import {assertPromiseResolved} from "../../../../shared/asserts.js";

/**
 * Creates a mocked iframe and SharedWorker with the required functionality for the InternalDiscoveryManager.
 * @param {object} options
 * @param {() => Promise<void>} options.fn The test function to run
 * @param {string?} [options.assertIframeSrc] If set, makes an assertion that the iframe
 * src gets set to this value.
 * @param {boolean} [options.emulateStudioParent] Emulates a parent window.
 * @param {boolean} [options.emulateParentResponse] When `emulateStudioParent` is true, also emulates "requestInternalDiscoveryUrl" messages.
 */
async function basicSetup({
	fn,
	assertIframeSrc = null,
	emulateStudioParent = true,
	emulateParentResponse = true,
}) {
	const previousDocument = globalThis.document;
	const previousParent = window.parent;
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
		let iframeSrcWasSet = false;
		globalThis.document = /** @type {Document} */ ({
			/**
			 * @param {"iframe"} tagName
			 */
			createElement(tagName) {
				if (tagName != "iframe") {
					throw new Error("Unexpected tag name");
				}
				/** @type {((message: any) => void)?} */
				let createMessageEventFn = null;

				const contentWindow = /** @type {Window} */ ({
					postMessage(message, options) {
						if (createMessageEventFn) {
							createMessageEventFn(message);
						}
					},
				});

				const mockIframe = /** @type {HTMLIFrameElement} */ ({
					style: {},
					contentWindow,
					/**
					 * @param {string} value
					 */
					set src(value) {
						if (assertIframeSrc) {
							assertEquals(value, assertIframeSrc);
						}
						iframeSrcWasSet = true;
						const {createMessageEvent} = createIframeWithWindow(contentWindow);
						createMessageEventFn = createMessageEvent;
					},
				});
				return mockIframe;
			},
			body: {
				appendChild(child) {},
			},
		});

		if (emulateStudioParent) {
			/** @type {TypedMessenger<import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindowBuildView/ContentWindowBuildView.js").BuildViewIframeResponseHandlers, {}>} */
			const parentTypedMessenger = new TypedMessenger();
			parentTypedMessenger.setResponseHandlers({
				requestInternalDiscoveryUrl() {
					return "discovery_url";
				},
				async requestStudioClientData() {
					return {
						clientId: "studio_client_id",
						internalConnectionToken: "studio_connection_token",
					};
				},
			});
			parentTypedMessenger.setSendHandler(data => {
				parentMessageEventListeners.forEach(listener => {
					const event = /** @type {MessageEvent} */ ({
						data: data.sendData,
						source: window.parent,
					});
					listener(event);
				});
			});

			window.parent = /** @type {Window} */ ({
				postMessage(message) {
					if (emulateParentResponse) {
						parentTypedMessenger.handleReceivedMessage(message);
					}
				},
			});
		} else {
			window.parent = window;
		}

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

			if (assertIframeSrc != null && !iframeSrcWasSet) {
				throw new AssertionError("The test finished and no iframe src has been set");
			}
		})();
	} finally {
		globalThis.document = previousDocument;
		window.parent = previousParent;
		globalThis.SharedWorker = previousSharedWorker;

		createdMessagePorts.forEach(p => p.close());
	}
}

Deno.test({
	name: "Calling registerClient twice throws",
	async fn() {
		await basicSetup({
			async fn() {
				const manager = new DiscoveryManagerInternal();
				await manager.registerClient("studio");

				await assertRejects(async () => {
					await manager.registerClient("inspector");
				}, Error, "A client has already been registered.");
			},
		});
	},
});

Deno.test({
	name: "getClientId resolves with the client id after registering",
	async fn() {
		await basicSetup({
			async fn() {
				const manager1 = new DiscoveryManagerInternal();

				const promise1 = manager1.getClientId();
				await assertPromiseResolved(promise1, false);

				await manager1.registerClient("studio");

				await assertPromiseResolved(promise1, true);

				const promise2 = manager1.getClientId();
				await assertPromiseResolved(promise2, true);

				const manager2 = new DiscoveryManagerInternal();
				/** @type {(clientId: string) => void} */
				let resolveStudioClientId = () => {};
				/** @type {Promise<string>} */
				const studioClientId = new Promise(resolve => {
					resolveStudioClientId = resolve;
				});
				manager2.onAvailableConnectionsChanged(() => {
					const connections = Array.from(manager2.availableConnections());
					assertEquals(connections.length, 1);
					resolveStudioClientId(connections[0].id);
				});
				await manager2.registerClient("inspector");

				assertEquals(await promise1, await studioClientId);
				assertEquals(await promise2, await studioClientId);
			},
		});
	},
});

Deno.test({
	name: "available client updates are sent correctly",
	async fn() {
		await basicSetup({
			async fn() {
				const manager1 = new DiscoveryManagerInternal({forceDiscoveryUrl: "url"});
				const availableChangedSpy1 = spy();
				let spyCall = 0;
				manager1.onAvailableConnectionsChanged(availableChangedSpy1);
				await manager1.registerClient("inspector");

				const manager2 = new DiscoveryManagerInternal({forceDiscoveryUrl: "url"});
				await manager2.registerClient("studio");

				assertSpyCalls(availableChangedSpy1, ++spyCall);
				const availableConnections1 = Array.from(manager1.availableConnections());
				assertEquals(availableConnections1.length, 1);
				const manager2ClientId = availableConnections1[0].id;
				assertEquals(availableConnections1[0], {
					id: manager2ClientId,
					clientType: "studio",
					projectMetaData: null,
				});

				await manager2.setProjectMetaData({
					name: "project name 1",
					uuid: "project uuid 1",
					fileSystemHasWritePermissions: false,
				});
				assertSpyCalls(availableChangedSpy1, ++spyCall);
				assertEquals(Array.from(manager1.availableConnections()), [
					{
						clientType: "studio",
						id: manager2ClientId,
						projectMetaData: {
							name: "project name 1",
							uuid: "project uuid 1",
							fileSystemHasWritePermissions: false,
						},
					},
				]);

				await manager2.setProjectMetaData({
					name: "project name 1",
					uuid: "project uuid 1",
					fileSystemHasWritePermissions: true,
				});
				assertSpyCalls(availableChangedSpy1, ++spyCall);
				assertEquals(Array.from(manager1.availableConnections()), [
					{
						clientType: "studio",
						id: manager2ClientId,
						projectMetaData: {
							name: "project name 1",
							uuid: "project uuid 1",
							fileSystemHasWritePermissions: true,
						},
					},
				]);

				await manager2.setProjectMetaData(null);
				assertSpyCalls(availableChangedSpy1, ++spyCall);
				assertEquals(Array.from(manager1.availableConnections()), [
					{
						clientType: "studio",
						id: manager2ClientId,
						projectMetaData: null,
					},
				]);

				const manager3 = new DiscoveryManagerInternal({forceDiscoveryUrl: "url"});
				const availableChangedSpy3 = spy();
				manager3.onAvailableConnectionsChanged(availableChangedSpy3);
				await manager3.registerClient("inspector");

				assertSpyCalls(availableChangedSpy3, 2);
				const availableConnections2 = Array.from(manager3.availableConnections());
				assertEquals(availableConnections2.length, 2);
				const manager1ClientId = availableConnections2[0].id;
				assertEquals(availableConnections2, [
					{
						id: manager1ClientId,
						clientType: "inspector",
						projectMetaData: null,
					},
					{
						id: manager2ClientId,
						clientType: "studio",
						projectMetaData: null,
					},
				]);

				assertSpyCalls(availableChangedSpy1, ++spyCall);
				const availableConnections3 = Array.from(manager1.availableConnections());
				const manager3ClientId = availableConnections3[1].id;
				assertEquals(availableConnections3, [
					{
						id: manager2ClientId,
						clientType: "studio",
						projectMetaData: null,
					},
					{
						id: manager3ClientId,
						clientType: "inspector",
						projectMetaData: null,
					},
				]);

				await manager2.destructor();
				assertSpyCalls(availableChangedSpy1, ++spyCall);
				assertEquals(Array.from(manager1.availableConnections()), [
					{
						id: manager3ClientId,
						clientType: "inspector",
						projectMetaData: null,
					},
				]);

				assertSpyCalls(availableChangedSpy3, 3);
				assertEquals(Array.from(manager1.availableConnections()), [
					{
						id: manager3ClientId,
						clientType: "inspector",
						projectMetaData: null,
					},
				]);

				await manager3.destructor();
				assertSpyCalls(availableChangedSpy1, ++spyCall);
				assertEquals(Array.from(manager1.availableConnections()), []);
			},
		});
	},
});

/** @type {(handler: import("../../../../../../src/network/studioConnections/messageHandlers/MessageHandlerInternal.js").MessageHandlerInternal) => void} */
const onCreatedSpySignature = () => {};

Deno.test({
	name: "connecting two clients",
	async fn() {
		await basicSetup({
			async fn() {
				const manager1 = new DiscoveryManagerInternal({forceDiscoveryUrl: "url"});
				const manager1ConnectionSpy = spy(onCreatedSpySignature);
				manager1.onConnectionRequest(manager1ConnectionSpy);
				const manager1AvailableSpy = spy();
				manager1.onAvailableConnectionsChanged(manager1AvailableSpy);
				await manager1.registerClient("studio");

				const manager2 = new DiscoveryManagerInternal({forceDiscoveryUrl: "url"});
				const manager2ConnectionSpy = spy(onCreatedSpySignature);
				manager2.onConnectionRequest(manager2ConnectionSpy);
				const manager2AvailableSpy = spy();
				manager2.onAvailableConnectionsChanged(manager2AvailableSpy);
				await manager2.registerClient("inspector");

				assertSpyCalls(manager1AvailableSpy, 1);
				const availableConnections1 = Array.from(manager1.availableConnections());
				assertEquals(availableConnections1.length, 1);
				const manager2ClientId = availableConnections1[0].id;
				assertSpyCalls(manager2AvailableSpy, 1);
				const availableConnections2 = Array.from(manager2.availableConnections());
				assertEquals(availableConnections2.length, 1);
				const manager1ClientId = availableConnections2[0].id;
				await manager1.requestConnection(manager2ClientId);

				assertSpyCalls(manager1ConnectionSpy, 1);
				const handler1 = manager1ConnectionSpy.calls[0].args[0];
				assertEquals(handler1.connectionId, manager2ClientId);
				const manager1Port = handler1.messagePort;
				assertInstanceOf(manager1Port, MessagePort);

				assertSpyCalls(manager2ConnectionSpy, 1);
				const handler2 = manager2ConnectionSpy.calls[0].args[0];
				assertEquals(handler2.connectionId, manager1ClientId);
				const manager2Port = handler2.messagePort;
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

Deno.test({
	name: "connection data is passed from one client to another",
	async fn() {
		await basicSetup({
			async fn() {
				const manager1 = new DiscoveryManagerInternal();
				await manager1.registerClient("studio");
				const connectionCreatedSpy1 = spy(onCreatedSpySignature);
				manager1.onConnectionRequest(connectionCreatedSpy1);

				const studioClientId = await manager1.getClientId();
				const manager2 = new DiscoveryManagerInternal();
				const connectionCreatedSpy2 = spy(onCreatedSpySignature);
				manager2.onConnectionRequest(connectionCreatedSpy2);
				await manager2.registerClient("inspector");
				await manager2.requestConnection(studioClientId, {
					token: "the_token",
				});

				assertSpyCalls(connectionCreatedSpy1, 1);
				assertSpyCalls(connectionCreatedSpy2, 1);
				const handler1 = connectionCreatedSpy1.calls[0].args[0];
				const handler2 = connectionCreatedSpy2.calls[0].args[0];
				assertEquals(handler1.connectionData.token, "the_token");
				assertEquals(handler2.connectionData.token, undefined);

				const manager1Port = handler1.messagePort;
				assertExists(manager1Port);
				const manager2Port = handler2.messagePort;
				assertExists(manager2Port);
				manager1Port.close();
				manager2Port.close();
			},
		});
	},
});

Deno.test({
	name: "Get discovery manager url from parent",
	async fn() {
		await basicSetup({
			assertIframeSrc: "discovery_url",
			async fn() {
				const manager = new DiscoveryManagerInternal();
				await manager.registerClient("studio");
			},
		});
	},
});

Deno.test({
	name: "Not inside an iframe, use the fallback discovery url",
	async fn() {
		await basicSetup({
			emulateStudioParent: false,
			assertIframeSrc: "fallback_url",
			async fn() {
				const manager = new DiscoveryManagerInternal({
					fallbackDiscoveryUrl: "fallback_url",
				});
				await manager.registerClient("studio");
			},
		});
	},
});

Deno.test({
	name: "Not inside in an iframe, no fallback url, throws",
	async fn() {
		await basicSetup({
			emulateStudioParent: false,
			async fn() {
				const manager = new DiscoveryManagerInternal();
				await assertRejects(async () => {
					await manager.registerClient("studio");
				}, Error, "Failed to initialize InternalDiscoveryManager. Either the current page is not in an iframe, or the parent didn't respond with a discovery url in a timely manner. Make sure to set a fallback discovery url if you wish to use an inspector on pages not opened by Renda Studio.");
			},
		});
	},
});

Deno.test({
	name: "Inside an iframe, but parent doesn't respond in time",
	async fn() {
		await basicSetup({
			emulateParentResponse: false,
			async fn() {
				const time = new FakeTime();
				try {
					const manager = new DiscoveryManagerInternal();
					const assertPromise = assertRejects(async () => {
						await manager.registerClient("studio");
					}, Error, "Failed to initialize InternalDiscoveryManager. Either the current page is not in an iframe, or the parent didn't respond with a discovery url in a timely manner. Make sure to set a fallback discovery url if you wish to use an inspector on pages not opened by Renda Studio.");
					await time.tickAsync(10_000);
					await assertPromise;
				} finally {
					time.restore();
				}
			},
		});
	},
});

Deno.test({
	name: "requestParentStudioConnection()",
	async fn() {
		await basicSetup({
			async fn() {
				const manager = new DiscoveryManagerInternal();
				await manager.registerClient("inspector");
				const requestConnectionSpy = stub(manager, "requestConnection");
				await manager.requestParentStudioConnection();
				assertSpyCalls(requestConnectionSpy, 1);
				assertSpyCall(requestConnectionSpy, 0, {
					args: [
						"studio_client_id",
						{
							token: "studio_connection_token",
						},
					],
				});
			},
		});
	},
});

Deno.test({
	name: "requestParentStudioConnection() throws when not in an iframe",
	async fn() {
		await basicSetup({
			emulateStudioParent: false,
			async fn() {
				const manager = new DiscoveryManagerInternal({fallbackDiscoveryUrl: "fallback_url"});
				await manager.registerClient("inspector");
				await assertRejects(async () => {
					await manager.requestParentStudioConnection();
				}, Error, "Failed to get parent client data. requestParentStudioConnection() only works when called on a page that was created by Renda Studio. If this is not the case, use requestConnection() to connect to the specific client you wish to connect to.");
			},
		});
	},
});

Deno.test({
	name: "requestParentStudioConnection() throws when iframe doesn't respond in time",
	async fn() {
		await basicSetup({
			emulateParentResponse: false,
			async fn() {
				const time = new FakeTime();
				try {
					const manager = new DiscoveryManagerInternal({fallbackDiscoveryUrl: "fallback_url"});
					const assertPromise = assertRejects(async () => {
						await manager.requestParentStudioConnection();
					}, Error, "Failed to get parent client data. The parent didn't respond with client data in timely manner. requestParentStudioConnection() only works when called on a page that was created by Renda Studio. If this is not the case, use requestConnection() to connect to the specific client you wish to connect to.");
					await time.nextAsync();
					await assertPromise;
				} finally {
					time.restore();
				}
			},
		});
	},
});
