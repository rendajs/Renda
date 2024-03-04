import { AssertionError, assertEquals } from "std/testing/asserts.ts";
import { spy } from "std/testing/mock.ts";
import { TypedMessenger } from "../../../../../../../src/mod.js";

/** @type {Set<MockWebSocket>} */
const createdWebSockets = new Set();

/**
 * Asserts that exactly only one websocket was created and returns it.
 */
export function getSingleCreatedWebSocket() {
	assertEquals(createdWebSockets.size, 1);
	for (const socket of createdWebSockets) {
		return socket;
	}
	throw new AssertionError("");
}

export function clearCreatedWebSockets() {
	createdWebSockets.clear();
}

export const originalWebSocketConnecting = WebSocket.CONNECTING;
export const originalWebSocketOpen = WebSocket.OPEN;
export const originalWebSocketClosed = WebSocket.CLOSED;
export class MockWebSocket extends EventTarget {
	#endpoint;
	get endpoint() {
		return this.#endpoint;
	}

	/** @type {TypedMessenger<import("https://raw.githubusercontent.com/rendajs/studio-discovery-server/f11212158ce959f55713888eb7fb03679c186ef5/src/WebSocketConnection.js").StudioDescoveryResponseHandlers, import("../../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").ExternalDiscoveryMethodResponseHandlers>} */
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

		/** @param {import("../../../../../../../src/network/studioConnections/DiscoveryManager.js").ClientType} clientType */
		const registerClient = (clientType) => {};
		this.registerClientSpy = spy(registerClient);

		/** @param {import("../../../../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionProjectMetadata} projectMetada */
		const setProjectMetadata = (projectMetada) => {};
		this.setProjectMetadataSpy = spy(setProjectMetadata);

		/**
		 * @param {import("../../../../../../../src/mod.js").UuidString} otherClientUuid
		 * @param {import("../../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").ExternalDiscoveryRelayData} data
		 */
		const relayMessage = (otherClientUuid, data) => {};
		this.relayMessageSpy = spy(relayMessage);

		this.#messenger.setSendHandler((data) => {
			this.dispatchEvent(new MessageEvent("message", {
				data: JSON.stringify(data.sendData),
			}));
		});
		this.#messenger.setResponseHandlers({
			registerClient: (clientType) => {
				this.registerClientSpy(clientType);
			},
			relayMessage: (otherClientUuid, data) => {
				this.relayMessageSpy(otherClientUuid, data);
				return {
					$respondOptions: { respond: false },
				};
			},
			setProjectMetadata: (projectMetadata) => {
				this.setProjectMetadataSpy(projectMetadata);
				return {
					$respondOptions: { respond: false },
				};
			},
		});

		createdWebSockets.add(this);
	}

	/**
	 * @param {string} data
	 */
	send(data) {
		/** @type {import("../../../../../../../src/mod.js").TypedMessengerMessageSendData<import("https://raw.githubusercontent.com/rendajs/studio-discovery-server/f11212158ce959f55713888eb7fb03679c186ef5/src/WebSocketConnection.js").StudioDescoveryResponseHandlers, import("../../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").ExternalDiscoveryMethodResponseHandlers>} */
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
