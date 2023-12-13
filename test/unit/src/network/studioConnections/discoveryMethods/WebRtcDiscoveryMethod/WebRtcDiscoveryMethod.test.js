import {assertEquals, assertInstanceOf, assertRejects} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {WebRtcDiscoveryMethod} from "../../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js";
import {WebRtcMessageHandler} from "../../../../../../../src/network/studioConnections/messageHandlers/WebRtcMessageHandler.js";
import {MockWebSocket, clearCreatedWebSockets, getSingleCreatedWebSocket, originalWebSocketClosed} from "./MockWebSocket.js";
import {MockRTCPeerConnection, clearCreatedRtcConnections, getSingleCreatedRtcConnection} from "./MockRTCPeerConnection.js";
import {waitForMicrotasks} from "../../../../../shared/waitForMicroTasks.js";
import {assertPromiseResolved} from "../../../../../shared/asserts.js";

/**
 * @param {object} options
 * @param {() => Promise<void>} options.fn
 */
async function basicSetup({
	fn,
}) {
	const oldWebSocket = globalThis.WebSocket;
	globalThis.WebSocket = /** @type {typeof WebSocket} */ (/** @type {unknown} */ (MockWebSocket));
	const oldRTCPeerConnection = globalThis.RTCPeerConnection;
	globalThis.RTCPeerConnection = /** @type {typeof RTCPeerConnection} */ (/** @type {unknown} */ (MockRTCPeerConnection));

	try {
		await fn();
	} finally {
		clearCreatedWebSockets();
		clearCreatedRtcConnections();
		globalThis.WebSocket = oldWebSocket;
		globalThis.RTCPeerConnection = oldRTCPeerConnection;
	}
}

Deno.test({
	name: "Connects to and disconnects from the websocket",
	async fn() {
		await basicSetup({
			async fn() {
				const manager = new WebRtcDiscoveryMethod("endpoint");
				/** @type {import("../../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").OnDiscoveryManagerWebRtcStatusChangeCallback} */
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
				/** @type {import("../../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").OnDiscoveryManagerWebRtcStatusChangeCallback} */
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

/**
 * @param {WebRtcDiscoveryMethod} discoveryMethod
 */
function createOnConnectionRequestSpy(discoveryMethod) {
	/** @param {WebRtcMessageHandler} handler */
	const onConnectionRequest = handler => {};
	const onConnectionRequestSpy = spy(onConnectionRequest);
	discoveryMethod.onConnectionRequest(onConnectionRequestSpy);
	return {
		onConnectionRequestSpy,
		getMessageHandler() {
			assertSpyCalls(onConnectionRequestSpy, 1);
			const handler = onConnectionRequestSpy.calls[0].args[0];
			assertInstanceOf(handler, WebRtcMessageHandler);
			return handler;
		},
	};
}

Deno.test({
	name: "Receiving an rtc description and ice candidate creates a new connection",
	async fn() {
		await basicSetup({
			async fn() {
				const discoveryMethod = new WebRtcDiscoveryMethod("endpoint");
				const {getMessageHandler} = createOnConnectionRequestSpy(discoveryMethod);

				const socket = getSingleCreatedWebSocket();
				socket.messenger.send.addAvailableConnection({
					id: "otherUuid",
					clientType: "inspector",
					projectMetadata: null,
				});
				socket.messenger.send.relayMessage("otherUuid", {
					type: "rtcDescription",
					description: {
						type: "offer",
						sdp: "offer",
					},
				});
				socket.messenger.send.relayMessage("otherUuid", {
					type: "rtcIceCandidate",
					candidate: /** @type {RTCIceCandidate} */ ({
						candidate: "other ice candidate",
					}),
				});

				const handler = getMessageHandler();
				assertEquals(handler.status, "connecting");

				const rtcConnection = getSingleCreatedRtcConnection();
				rtcConnection.dispatchEvent(new Event("negotiationneeded"));
				await waitForMicrotasks();

				assertEquals(rtcConnection.localDescription, /** @type {RTCSessionDescription} */ ({
					type: "answer",
					sdp: "",
				}));
				assertEquals(rtcConnection.remoteDescription, /** @type {RTCSessionDescription} */ ({
					type: "offer",
					sdp: "offer",
				}));
				assertEquals(rtcConnection.addedIceCandidates, [
					{
						candidate: "other ice candidate",
					},
				]);

				await waitForMicrotasks();

				assertSpyCalls(socket.relayMessageSpy, 1);
				assertSpyCall(socket.relayMessageSpy, 0, {
					args: [
						"otherUuid",
						{
							type: "rtcDescription",
							description: {
								type: "answer",
							},
						},
					],
				});
			},
		});
	},
});

/**
 * @param {WebRtcDiscoveryMethod} discoveryMethod
 */
function createAndConnectSingleAvailableConnection(discoveryMethod) {
	const socket = getSingleCreatedWebSocket();
	socket.messenger.send.addAvailableConnection({
		id: "otherUuid",
		clientType: "inspector",
		projectMetadata: null,
	});

	discoveryMethod.requestConnection("otherUuid", {token: "the_token"});
	return {socket};
}

Deno.test({
	name: "Requesting a new connection sends the right messages and creates datachannels",
	async fn() {
		await basicSetup({
			async fn() {
				const discoveryMethod = new WebRtcDiscoveryMethod("endpoint");
				const {getMessageHandler} = createOnConnectionRequestSpy(discoveryMethod);

				const {socket} = createAndConnectSingleAvailableConnection(discoveryMethod);

				const handler = getMessageHandler();
				assertEquals(handler.status, "connecting");

				const rtcConnection = getSingleCreatedRtcConnection();
				rtcConnection.dispatchEvent(new Event("negotiationneeded"));
				await waitForMicrotasks();

				assertEquals(rtcConnection.localDescription, /** @type {RTCSessionDescription} */ ({
					type: "offer",
					sdp: "",
				}));
				assertSpyCalls(socket.relayMessageSpy, 1);
				assertSpyCall(socket.relayMessageSpy, 0, {
					args: [
						"otherUuid",
						{
							type: "rtcDescription",
							description: {
								type: "offer",
							},
						},
					],
				});

				const candidateEvent = /** @type {RTCPeerConnectionIceEvent} */ (new Event("icecandidate"));
				// @ts-ignore
				candidateEvent.candidate = {
					candidate: "candidate",
				};
				rtcConnection.dispatchEvent(candidateEvent);
				await waitForMicrotasks();

				assertSpyCalls(socket.relayMessageSpy, 2);
				assertSpyCall(socket.relayMessageSpy, 1, {
					args: [
						"otherUuid",
						{
							type: "rtcIceCandidate",
							candidate: /** @type {RTCIceCandidate} */ ({
								candidate: "candidate",
							}),
						},
					],
				});
			},
		});
	},
});

Deno.test({
	name: "Message handler status is updated",
	async fn() {
		await basicSetup({
			async fn() {
				const discoveryMethod = new WebRtcDiscoveryMethod("endpoint");
				const {getMessageHandler} = createOnConnectionRequestSpy(discoveryMethod);

				createAndConnectSingleAvailableConnection(discoveryMethod);

				const handler = getMessageHandler();
				assertEquals(handler.status, "connecting");

				const rtcConnection = getSingleCreatedRtcConnection();

				rtcConnection.setMockConnectionState("connecting");
				assertEquals(handler.status, "connecting");

				rtcConnection.setMockConnectionState("connected");
				assertEquals(handler.status, "connecting");

				const reliableChannel = rtcConnection.addMockDataChannel("reliable");
				const unreliableChannel = rtcConnection.addMockDataChannel("unreliable");

				reliableChannel.setMockReadyState("open");
				assertEquals(handler.status, "connecting");

				unreliableChannel.setMockReadyState("open");
				assertEquals(handler.status, "connected");
			},
		});
	},
});

Deno.test({
	name: "Messages are not sent until the connection is open",
	async fn() {
		await basicSetup({
			async fn() {
				const discoveryMethod = new WebRtcDiscoveryMethod("endpoint");
				const {getMessageHandler} = createOnConnectionRequestSpy(discoveryMethod);

				createAndConnectSingleAvailableConnection(discoveryMethod);

				const handler = getMessageHandler();

				const sendData = new ArrayBuffer(42);
				const sendPromise = handler.send(sendData);
				await assertPromiseResolved(sendPromise, false);

				const rtcConnection = getSingleCreatedRtcConnection();
				rtcConnection.setMockConnectionState("connected");
				const reliableChannel = rtcConnection.addMockDataChannel("reliable");
				const sendSpy = spy(reliableChannel, "send");
				reliableChannel.setMockReadyState("open");
				await waitForMicrotasks();
				assertSpyCalls(sendSpy, 0);

				const unreliableChannel = rtcConnection.addMockDataChannel("unreliable");
				unreliableChannel.setMockReadyState("open");

				await assertPromiseResolved(sendPromise, true);
				assertSpyCalls(sendSpy, 1);
			},
		});
	},
});

Deno.test({
	name: "Send throws when it's not an ArrayBuffer",
	async fn() {
		await basicSetup({
			async fn() {
				const discoveryMethod = new WebRtcDiscoveryMethod("endpoint");
				const {getMessageHandler} = createOnConnectionRequestSpy(discoveryMethod);
				createAndConnectSingleAvailableConnection(discoveryMethod);
				const rtcConnection = getSingleCreatedRtcConnection();
				rtcConnection.setMockConnectionState("connected");
				const reliableChannel = rtcConnection.addMockDataChannel("reliable");
				reliableChannel.setMockReadyState("open");
				const unreliableChannel = rtcConnection.addMockDataChannel("unreliable");
				unreliableChannel.setMockReadyState("open");

				const handler = getMessageHandler();
				await assertRejects(async () => {
					await handler.send({arbitraryData: 42});
				}, Error, "This message handler only supports sending array buffers.");
			},
		});
	},
});
