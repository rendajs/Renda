import {InternalDiscoveryMethod} from "../../../../../../src/network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js";
import {assertSpyCalls, mockSessionAsync, spy, stub} from "std/testing/mock.ts";
import {initializeIframe} from "../../../../../../studio/src/network/studioConnections/internalDiscovery/internalDiscoveryIframeMain.js";
import {initializeWorker} from "../../../../../../studio/src/network/studioConnections/internalDiscovery/internalDiscoveryWorkerMain.js";
import {AssertionError, assertEquals, assertRejects} from "std/testing/asserts.ts";
import {waitForMicrotasks} from "../../../../shared/waitForMicroTasks.js";
import {assertPromiseResolved} from "../../../../shared/asserts.js";

/**
 * Creates a mocked iframe and SharedWorker with the required functionality for the InternalDiscoveryMethod.
 * @param {object} options
 * @param {() => Promise<void>} options.fn The test function to run
 * @param {string?} [options.assertIframeSrc] If set, makes an assertion that the iframe
 * src gets set to this value.
 * @param {boolean} [options.emulateStudioParent] Emulates a parent window.
 */
async function basicSetup({
	fn,
	assertIframeSrc = null,
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
			// parent window a chance to setup the InternalDiscoveryMethod class
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
				const method = new InternalDiscoveryMethod("endpoint");
				await method.registerClient("studio-host");

				await assertRejects(async () => {
					await method.registerClient("inspector");
				}, Error, "A client has already been registered.");
			},
		});
	},
});

Deno.test({
	name: "getClientUuid resolves with the client id after registering",
	async fn() {
		await basicSetup({
			async fn() {
				const method1 = new InternalDiscoveryMethod("endpoint");

				const promise1 = method1.getClientUuid();
				await assertPromiseResolved(promise1, false);

				await method1.registerClient("studio-host");

				await assertPromiseResolved(promise1, true);

				const promise2 = method1.getClientUuid();
				await assertPromiseResolved(promise2, true);

				const method2 = new InternalDiscoveryMethod("endpoint");
				/** @type {(clientId: string) => void} */
				let resolveStudioClientId = () => {};
				/** @type {Promise<string>} */
				const studioClientId = new Promise(resolve => {
					resolveStudioClientId = resolve;
				});
				method2.onAvailableConnectionsChanged(() => {
					const connections = Array.from(method2.availableConnections());
					assertEquals(connections.length, 1);
					resolveStudioClientId(connections[0].id);
				});
				await method2.registerClient("inspector");

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
				const method1 = new InternalDiscoveryMethod("url");
				const availableChangedSpy1 = spy();
				let spyCall = 0;
				method1.onAvailableConnectionsChanged(availableChangedSpy1);
				await method1.registerClient("inspector");

				const method2 = new InternalDiscoveryMethod("url");
				await method2.registerClient("studio-host");

				assertSpyCalls(availableChangedSpy1, ++spyCall);
				const availableConnections1 = Array.from(method1.availableConnections());
				assertEquals(availableConnections1.length, 1);
				const method2ClientId = availableConnections1[0].id;
				assertEquals(availableConnections1[0], {
					id: method2ClientId,
					clientType: "studio-host",
					projectMetadata: null,
				});

				await method2.setProjectMetadata({
					name: "project name 1",
					uuid: "project uuid 1",
					fileSystemHasWritePermissions: false,
				});
				assertSpyCalls(availableChangedSpy1, ++spyCall);
				assertEquals(Array.from(method1.availableConnections()), [
					{
						clientType: "studio-host",
						id: method2ClientId,
						projectMetadata: {
							name: "project name 1",
							uuid: "project uuid 1",
							fileSystemHasWritePermissions: false,
						},
					},
				]);

				await method2.setProjectMetadata({
					name: "project name 1",
					uuid: "project uuid 1",
					fileSystemHasWritePermissions: true,
				});
				assertSpyCalls(availableChangedSpy1, ++spyCall);
				assertEquals(Array.from(method1.availableConnections()), [
					{
						clientType: "studio-host",
						id: method2ClientId,
						projectMetadata: {
							name: "project name 1",
							uuid: "project uuid 1",
							fileSystemHasWritePermissions: true,
						},
					},
				]);

				await method2.setProjectMetadata(null);
				assertSpyCalls(availableChangedSpy1, ++spyCall);
				assertEquals(Array.from(method1.availableConnections()), [
					{
						clientType: "studio-host",
						id: method2ClientId,
						projectMetadata: null,
					},
				]);

				const method3 = new InternalDiscoveryMethod("url");
				const availableChangedSpy3 = spy();
				method3.onAvailableConnectionsChanged(availableChangedSpy3);
				await method3.registerClient("inspector");

				assertSpyCalls(availableChangedSpy3, 1);
				const availableConnections2 = Array.from(method3.availableConnections());
				assertEquals(availableConnections2.length, 2);
				const method1ClientId = availableConnections2[0].id;
				assertEquals(availableConnections2, [
					{
						id: method1ClientId,
						clientType: "inspector",
						projectMetadata: null,
					},
					{
						id: method2ClientId,
						clientType: "studio-host",
						projectMetadata: null,
					},
				]);

				assertSpyCalls(availableChangedSpy1, ++spyCall);
				const availableConnections3 = Array.from(method1.availableConnections());
				const method3ClientId = availableConnections3[1].id;
				assertEquals(availableConnections3, [
					{
						id: method2ClientId,
						clientType: "studio-host",
						projectMetadata: null,
					},
					{
						id: method3ClientId,
						clientType: "inspector",
						projectMetadata: null,
					},
				]);

				await method2.destructor();
				assertSpyCalls(availableChangedSpy1, ++spyCall);
				assertEquals(Array.from(method1.availableConnections()), [
					{
						id: method3ClientId,
						clientType: "inspector",
						projectMetadata: null,
					},
				]);

				assertSpyCalls(availableChangedSpy3, 2);
				assertEquals(Array.from(method1.availableConnections()), [
					{
						id: method3ClientId,
						clientType: "inspector",
						projectMetadata: null,
					},
				]);

				await method3.destructor();
				assertSpyCalls(availableChangedSpy1, ++spyCall);
				assertEquals(Array.from(method1.availableConnections()), []);
			},
		});
	},
});

/** @type {(handler: import("../../../../../../src/network/studioConnections/messageHandlers/InternalMessageHandler.js").InternalMessageHandler) => void} */
const onCreatedSpySignature = () => {};

Deno.test({
	name: "connecting two clients, other end accepts",
	async fn() {
		await basicSetup({
			async fn() {
				const method1 = new InternalDiscoveryMethod("url");
				const method1RequestSpy = spy(onCreatedSpySignature);
				method1.onConnectionRequest(method1RequestSpy);
				const method1AvailableSpy = spy();
				method1.onAvailableConnectionsChanged(method1AvailableSpy);
				await method1.registerClient("studio-host");
				await method1.setProjectMetadata({
					fileSystemHasWritePermissions: true,
					name: "project name",
					uuid: "project uuid",
				});

				const method2 = new InternalDiscoveryMethod("url");
				const method2RequestSpy = spy(onCreatedSpySignature);
				method2.onConnectionRequest(method2RequestSpy);
				const method2AvailableSpy = spy();
				method2.onAvailableConnectionsChanged(method2AvailableSpy);
				await method2.registerClient("inspector");

				assertSpyCalls(method1AvailableSpy, 1);
				const availableConnections1 = Array.from(method1.availableConnections());
				assertEquals(availableConnections1.length, 1);
				const method2ClientId = availableConnections1[0].id;
				assertSpyCalls(method2AvailableSpy, 1);
				const availableConnections2 = Array.from(method2.availableConnections());
				assertEquals(availableConnections2.length, 1);
				const method1ClientId = availableConnections2[0].id;
				await method1.requestConnection(method2ClientId, {
					token: "token",
				});

				assertSpyCalls(method1RequestSpy, 1);
				const handler1 = method1RequestSpy.calls[0].args[0];
				assertEquals(handler1.otherClientUuid, method2ClientId);
				assertEquals(handler1.clientType, "inspector");
				assertEquals(handler1.initiatedByMe, true);
				assertEquals(handler1.internalConnectionData, {});
				assertEquals(handler1.projectMetadata, null);

				assertSpyCalls(method2RequestSpy, 1);
				const handler2 = method2RequestSpy.calls[0].args[0];
				assertEquals(handler2.otherClientUuid, method1ClientId);
				assertEquals(handler2.clientType, "studio-host");
				assertEquals(handler2.initiatedByMe, false);
				assertEquals(handler2.internalConnectionData, {token: "token"});
				assertEquals(handler2.projectMetadata, {
					fileSystemHasWritePermissions: true,
					name: "project name",
					uuid: "project uuid",
				});

				assertEquals(handler1.status, "outgoing-permission-pending");
				assertEquals(handler2.status, "incoming-permission-pending");

				handler1.requestAccepted();
				handler2.requestAccepted();

				// We wait for the status to change to connected.
				// Ideally we'd use waitForMicrotasks, but since messages are being sent via a MessagePort,
				// waiting for microtasks doesn't necessarily guarantee that all messages have been sent.
				/** @type {Promise<void>} */
				const connectedPromise1 = new Promise(resolve => {
					handler1.onStatusChange(status => {
						if (status == "connected") {
							resolve();
						}
					});
				});
				/** @type {Promise<void>} */
				const connectedPromise2 = new Promise(resolve => {
					handler2.onStatusChange(status => {
						if (status == "connected") {
							resolve();
						}
					});
				});
				await connectedPromise1;
				await connectedPromise2;

				assertEquals(handler1.status, "connected");
				assertEquals(handler2.status, "connected");

				// Check if the two ports are connected
				/** @type {(data: unknown) => void} */
				const messageSpyFn = () => {};
				const messageSpy1 = spy(messageSpyFn);
				const messageSpy2 = spy(messageSpyFn);
				handler1.onMessage(messageSpy1);
				handler2.onMessage(messageSpy2);
				handler1.send("ping");
				handler2.send("pong");

				await waitForMicrotasks();

				assertSpyCalls(messageSpy1, 1);
				assertSpyCalls(messageSpy2, 1);
				assertEquals(messageSpy1.calls[0].args[0], "pong");
				assertEquals(messageSpy2.calls[0].args[0], "ping");

				handler1.close();
				handler2.close();
			},
		});
	},
});

Deno.test({
	name: "connecting two clients, other end rejects",
	async fn() {
		await basicSetup({
			async fn() {
				const method1 = new InternalDiscoveryMethod("url");
				const method1RequestSpy = spy(onCreatedSpySignature);
				method1.onConnectionRequest(method1RequestSpy);
				await method1.registerClient("studio-host");
				await method1.setProjectMetadata({
					fileSystemHasWritePermissions: true,
					name: "project name",
					uuid: "project uuid",
				});

				const method2 = new InternalDiscoveryMethod("url");
				const method2RequestSpy = spy(onCreatedSpySignature);
				method2.onConnectionRequest(method2RequestSpy);
				await method2.registerClient("inspector");

				const availableConnections1 = Array.from(method1.availableConnections());
				const method2ClientId = availableConnections1[0].id;
				await method1.requestConnection(method2ClientId, {
					token: "token",
				});

				const handler1 = method1RequestSpy.calls[0].args[0];
				const handler2 = method2RequestSpy.calls[0].args[0];

				assertEquals(handler1.status, "outgoing-permission-pending");
				assertEquals(handler2.status, "incoming-permission-pending");

				handler1.requestAccepted();
				handler2.requestRejected();

				// We wait for the status to change to connected.
				// Ideally we'd use waitForMicrotasks, but since messages are being sent via a MessagePort,
				// waiting for microtasks doesn't necessarily guarantee that all messages have been sent.
				/** @type {Promise<void>} */
				const connectedPromise1 = new Promise(resolve => {
					handler1.onStatusChange(status => {
						if (status == "outgoing-permission-rejected") {
							resolve();
						}
					});
				});
				/** @type {Promise<void>} */
				const connectedPromise2 = new Promise(resolve => {
					handler2.onStatusChange(status => {
						if (status == "connected") {
							resolve();
						}
					});
				});
				await connectedPromise1;
				await connectedPromise2;

				assertEquals(handler1.status, "outgoing-permission-rejected");
				assertEquals(handler2.status, "connected");

				handler1.close();
				handler2.close();
			},
		});
	},
});

Deno.test({
	name: "The provided discovery url is used for the iframe",
	async fn() {
		await basicSetup({
			assertIframeSrc: "discovery_url",
			async fn() {
				const method = new InternalDiscoveryMethod("discovery_url");
				await method.registerClient("studio-host");
			},
		});
	},
});
