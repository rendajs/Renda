import { TypedMessenger } from "../../../../../../../src/mod.js";

class FakeWebSocket extends EventTarget {
	/** @type {FakeWebSocket?} */
	#otherSocket = null;

	/** @type {number} */
	#readyState = WebSocket.CONNECTING;
	get readyState() {
		return this.#readyState;
	}

	/**
	 * @param {string} data
	 */
	send(data) {
		this.#otherSocket?.dispatchEvent(new MessageEvent("message", {
			data,
		}));
	}

	open() {
		this.#readyState = WebSocket.OPEN;
		this.dispatchEvent(new Event("open"));
	}

	error() {
		this.dispatchEvent(new Event("error"));
	}

	/**
	 * @param {FakeWebSocket} otherSocket
	 */
	attachOther(otherSocket) {
		this.#otherSocket = otherSocket;
	}

	castWebSocket() {
		return /** @type {WebSocket} */ (/** @type {unknown} */ (this));
	}
}

export function createLinkedWebSockets({
	open = true,
} = {}) {
	const socketA = new FakeWebSocket();
	const socketB = new FakeWebSocket();
	socketA.attachOther(socketB);
	socketB.attachOther(socketA);

	if (open) {
		socketA.open();
		socketB.open();
	}

	return { socketA, socketB };
}

/**
 * @template {import("../../../../../../../src/mod.js").TypedMessengerSignatures} TResA
 * @template {import("../../../../../../../src/mod.js").TypedMessengerSignatures} TResB
 * @param {WebSocket | FakeWebSocket} socketA
 * @param {WebSocket | FakeWebSocket} socketB
 * @param {TResA} handlersA
 * @param {TResB} handlersB
 */
export function createLinkedMessengers(socketA, socketB, handlersA, handlersB) {
	if (socketA instanceof FakeWebSocket) {
		socketA = socketA.castWebSocket();
	}
	if (socketB instanceof FakeWebSocket) {
		socketB = socketB.castWebSocket();
	}
	/** @type {TypedMessenger<TResA, TResB>} */
	const messengerA = new TypedMessenger();
	/** @type {TypedMessenger<TResB, TResA>} */
	const messengerB = new TypedMessenger();
	messengerA.initializeWebSocket(socketA, handlersA);
	messengerB.initializeWebSocket(socketB, handlersB);

	return { messengerA, messengerB };
}
