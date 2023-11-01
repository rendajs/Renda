import {assertEquals, assertInstanceOf} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {WebRtcDiscoveryMethod} from "../../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js";
import {WebRtcMessageHandler} from "../../../../../../../src/network/studioConnections/messageHandlers/WebRtcMessageHandler.js";
import {MockWebSocket, clearCreatedWebSockets, getSingleCreatedWebSocket, originalWebSocketClosed} from "./MockWebSocket.js";
import {MockRTCPeerConnection, clearCreatedRtcConnections, getSingleCreatedRtcConnection} from "./MockRTCPeerConnection.js";
import {waitForMicrotasks} from "../../../../../shared/waitForMicroTasks.js";

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

Deno.test({
	name: "Receiving an rtc description and ice candidate creates a new connection",
	async fn() {
		await basicSetup({
			async fn() {
				const manager = new WebRtcDiscoveryMethod("endpoint");
				/** @param {WebRtcMessageHandler} handler */
				const onConnectionRequest = handler => {};
				const onConnectionRequestSpy = spy(onConnectionRequest);
				manager.onConnectionRequest(onConnectionRequestSpy);

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

				assertSpyCalls(onConnectionRequestSpy, 1);
				const handler = onConnectionRequestSpy.calls[0].args[0];
				assertInstanceOf(handler, WebRtcMessageHandler);
				assertEquals(handler.status, "connecting");

				const rtcConnection = getSingleCreatedRtcConnection();
				assertEquals(rtcConnection.localDescription, null);
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
