import {AssertionError, assertEquals} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {WebRtcDiscoveryMethod} from "../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js";
import {TypedMessenger} from "../../../../../../src/mod.js";

/** @type {Set<MockWebSocket>} */
const createdWebSockets = new Set();

/**
 * Asserts that exactly only one websocket was created and returns it.
 */
function getSingleCreatedWebSocket() {
	assertEquals(createdWebSockets.size, 1);
	for (const socket of createdWebSockets) {
		return socket;
	}
	throw new AssertionError("");
}

const originalWebSocketConnecting = WebSocket.CONNECTING;
const originalWebSocketOpen = WebSocket.OPEN;
const originalWebSocketClosed = WebSocket.CLOSED;
class MockWebSocket extends EventTarget {
	#endpoint;
	get endpoint() {
		return this.#endpoint;
	}

	/** @type {TypedMessenger<import("https://raw.githubusercontent.com/rendajs/studio-discovery-server/423fa5d224dae56571a61bfd8d850b76fcdcc6fa/src/WebSocketConnection.js").StudioDescoveryResponseHandlers, import("../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").ExternalDiscoveryMethodResponseHandlers>} */
	#messenger = new TypedMessenger();
	get messenger() {
		return this.#messenger;
	}

	/** @type {number} */
	#readyState = originalWebSocketConnecting;
	get readyState() {
		return this.#readyState;
	}

	/**
	 * @param {string} endpoint
	 */
	constructor(endpoint) {
		super();
		this.#endpoint = endpoint;

		/** @param {import("../../../../../../src/network/studioConnections/DiscoveryManager.js").ClientType} clientType */
		const registerClient = clientType => {};
		this.registerClientSpy = spy(registerClient);

		/** @param {import("../../../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionProjectMetadata} projectMetada */
		const setProjectMetadata = projectMetada => {};
		this.setProjectMetadataSpy = spy(setProjectMetadata);

		this.#messenger.setSendHandler(data => {
			this.dispatchEvent(new MessageEvent("message", {
				data: JSON.stringify(data.sendData),
			}));
		});
		this.#messenger.setResponseHandlers({
			registerClient: clientType => {
				this.registerClientSpy(clientType);
			},
			relayMessage(otherClientUuid, data) {
				return {
					$respondOptions: {respond: false},
				};
			},
			setProjectMetadata: projectMetadata => {
				this.setProjectMetadataSpy(projectMetadata);
				return {
					$respondOptions: {respond: false},
				};
			},
		});

		createdWebSockets.add(this);
	}

	/**
	 * @param {string} data
	 */
	send(data) {
		/** @type {import("../../../../../../src/mod.js").TypedMessengerMessageSendData<import("https://raw.githubusercontent.com/rendajs/studio-discovery-server/423fa5d224dae56571a61bfd8d850b76fcdcc6fa/src/WebSocketConnection.js").StudioDescoveryResponseHandlers, import("../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").ExternalDiscoveryMethodResponseHandlers>} */
		const parsed = JSON.parse(data);
		this.#messenger.handleReceivedMessage(parsed);
	}

	close() {
		this.#readyState = originalWebSocketClosed;
		this.dispatchEvent(new CloseEvent("close"));
	}

	open() {
		this.#readyState = originalWebSocketOpen;
		this.dispatchEvent(new Event("open"));
	}
}

/**
 * @param {object} options
 * @param {() => Promise<void>} options.fn
 */
async function basicSetup({
	fn,
}) {
	const oldWebSocket = globalThis.WebSocket;
	globalThis.WebSocket = /** @type {typeof WebSocket} */ (/** @type {unknown} */ (MockWebSocket));

	try {
		await fn();
	} finally {
		createdWebSockets.clear();
		globalThis.WebSocket = oldWebSocket;
	}
}

Deno.test({
	name: "Connects to and disconnects from the websocket",
	async fn() {
		await basicSetup({
			async fn() {
				const manager = new WebRtcDiscoveryMethod("endpoint");
				/** @type {import("../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").OnDiscoveryManagerWebRtcStatusChangeCallback} */
				const onStatusChange = status => {};
				const onStatusChangeSpy = spy(onStatusChange);
				manager.onStatusChange(onStatusChangeSpy);

				const socket = getSingleCreatedWebSocket();
				assertEquals(socket.endpoint, "endpoint");
				assertEquals(manager.endpoint, "endpoint");
				assertEquals(manager.status, "connecting");
				assertSpyCalls(onStatusChangeSpy, 0);

				socket.open();
				assertSpyCalls(onStatusChangeSpy, 1);
				assertSpyCall(onStatusChangeSpy, 0, {
					args: ["connected"],
				});
				assertEquals(manager.status, "connected");

				manager.destructor();
				assertSpyCalls(onStatusChangeSpy, 2);
				assertSpyCall(onStatusChangeSpy, 1, {
					args: ["disconnected"],
				});
				assertEquals(manager.status, "disconnected");
				assertEquals(socket.readyState, originalWebSocketClosed);
			},
		});
	},
});

Deno.test({
	name: "Register client is passed on to the server",
	async fn() {
		await basicSetup({
			async fn() {
				const manager = new WebRtcDiscoveryMethod("endpoint");
				await manager.registerClient("studio-host");

				const socket = getSingleCreatedWebSocket();

				assertSpyCalls(socket.registerClientSpy, 1);
				assertSpyCall(socket.registerClientSpy, 0, {
					args: ["studio-host"],
				});
			},
		});
	},
});

Deno.test({
	name: "setProjectMetadata is passed on to the server",
	async fn() {
		await basicSetup({
			async fn() {
				const manager = new WebRtcDiscoveryMethod("endpoint");
				const socket = getSingleCreatedWebSocket();
				socket.open();

				await manager.registerClient("studio-host");
				manager.setProjectMetadata({
					fileSystemHasWritePermissions: true,
					name: "name",
					uuid: "id",
				});

				assertSpyCalls(socket.setProjectMetadataSpy, 1);
				assertSpyCall(socket.setProjectMetadataSpy, 0, {
					args: [
						{
							fileSystemHasWritePermissions: true,
							name: "name",
							uuid: "id",
						},
					],
				});
			},
		});
	},
});

Deno.test({
	name: "removeOnStatusChange() unregisters the callback",
	async fn() {
		await basicSetup({
			async fn() {
				const manager = new WebRtcDiscoveryMethod("endpoint");
				/** @type {import("../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").OnDiscoveryManagerWebRtcStatusChangeCallback} */
				const onStatusChange = status => {};
				const onStatusChangeSpy = spy(onStatusChange);
				manager.onStatusChange(onStatusChangeSpy);
				manager.removeOnStatusChange(onStatusChangeSpy);

				const socket = getSingleCreatedWebSocket();
				assertSpyCalls(onStatusChangeSpy, 0);

				socket.open();
				assertSpyCalls(onStatusChangeSpy, 0);
			},
		});
	},
});

Deno.test({
	name: "setAvailableConnections is passed to the superclass",
	async fn() {
		await basicSetup({
			async fn() {
				const manager = new WebRtcDiscoveryMethod("endpoint");

				/** @type {import("std/testing/mock.ts").Spy<WebRtcDiscoveryMethod, Parameters<WebRtcDiscoveryMethod["setAvailableConnections"]>>} */
				// @ts-ignore
				const setAvailableConnections = spy(manager, "setAvailableConnections");

				const socket = getSingleCreatedWebSocket();
				socket.messenger.send.setAvailableConnections([
					{
						clientType: "inspector",
						id: "id1",
						projectMetadata: null,
					},
				]);

				assertSpyCalls(setAvailableConnections, 1);
				assertSpyCall(setAvailableConnections, 0, {
					args: [
						[
							{
								clientType: "inspector",
								id: "id1",
								projectMetadata: null,
							},
						],
					],
				});
			},
		});
	},
});

Deno.test({
	name: "setAvailableConnections is passed to the superclass",
	async fn() {
		await basicSetup({
			async fn() {
				const manager = new WebRtcDiscoveryMethod("endpoint");

				/** @type {import("std/testing/mock.ts").Spy<WebRtcDiscoveryMethod, Parameters<WebRtcDiscoveryMethod["addAvailableConnection"]>>} */
				// @ts-ignore
				const addAvailableConnection = spy(manager, "addAvailableConnection");

				const socket = getSingleCreatedWebSocket();
				socket.messenger.send.addAvailableConnection({
					clientType: "studio-host",
					id: "id2",
					projectMetadata: {
						fileSystemHasWritePermissions: true,
						name: "name",
						uuid: "id",
					},
				});

				assertSpyCalls(addAvailableConnection, 1);
				assertSpyCall(addAvailableConnection, 0, {
					args: [
						{
							clientType: "studio-host",
							id: "id2",
							projectMetadata: {
								fileSystemHasWritePermissions: true,
								name: "name", uuid: "id",
							},
						},
					],
				});
			},
		});
	},
});

Deno.test({
	name: "removeAvailableConnection is passed to the superclass",
	async fn() {
		await basicSetup({
			async fn() {
				const manager = new WebRtcDiscoveryMethod("endpoint");

				/** @type {import("std/testing/mock.ts").Spy<WebRtcDiscoveryMethod, Parameters<WebRtcDiscoveryMethod["removeAvailableConnection"]>>} */
				// @ts-ignore
				const removeAvailableConnection = spy(manager, "removeAvailableConnection");

				const socket = getSingleCreatedWebSocket();
				socket.messenger.send.removeAvailableConnection("id3");

				assertSpyCalls(removeAvailableConnection, 1);
				assertSpyCall(removeAvailableConnection, 0, {
					args: ["id3"],
				});
			},
		});
	},
});

Deno.test({
	name: "removeAvailableConnection is passed to the superclass",
	async fn() {
		await basicSetup({
			async fn() {
				const manager = new WebRtcDiscoveryMethod("endpoint");

				/** @type {import("std/testing/mock.ts").Spy<WebRtcDiscoveryMethod, Parameters<WebRtcDiscoveryMethod["setConnectionProjectMetadata"]>>} */
				// @ts-ignore
				const setConnectionProjectMetadata = spy(manager, "setConnectionProjectMetadata");

				const socket = getSingleCreatedWebSocket();
				socket.messenger.send.setConnectionProjectMetadata("id3", {
					fileSystemHasWritePermissions: false,
					name: "name",
					uuid: "id",
				});

				assertSpyCalls(setConnectionProjectMetadata, 1);
				assertSpyCall(setConnectionProjectMetadata, 0, {
					args: [
						"id3", {
							fileSystemHasWritePermissions: false,
							name: "name",
							uuid: "id",
						},
					],
				});
			},
		});
	},
});
