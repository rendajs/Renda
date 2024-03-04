import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import { TypedMessenger } from "../../../../../../src/util/TypedMessenger/TypedMessenger.js";
import { assertSpyCalls, stub } from "std/testing/mock.ts";
import { assertPromiseResolved } from "../../../../shared/asserts.js";

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

function createLinkedWebSockets({
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
 * @template {import("../../../../../../src/mod.js").TypedMessengerSignatures} TResA
 * @template {import("../../../../../../src/mod.js").TypedMessengerSignatures} TResB
 * @param {WebSocket | FakeWebSocket} socketA
 * @param {WebSocket | FakeWebSocket} socketB
 * @param {TResA} handlersA
 * @param {TResB} handlersB
 */
function createLinkedMessengers(socketA, socketB, handlersA, handlersB) {
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

Deno.test({
	name: "initializeWebSocket()",
	async fn() {
		const { socketA, socketB } = createLinkedWebSockets();
		const { messengerB } = createLinkedMessengers(socketA, socketB, {
			foo() {
				return "foo";
			},
		}, {});

		const result = await messengerB.send.foo();
		assertEquals(result, "foo");
	},
});

Deno.test({
	name: "websocket messages aren't sent until the connection is open",
	async fn() {
		const { socketA, socketB } = createLinkedWebSockets({ open: false });
		const { messengerB } = createLinkedMessengers(socketA, socketB, {
			foo() {
				return "foo";
			},
		}, {});

		const promise = messengerB.send.foo();
		await assertPromiseResolved(promise, false);
		socketA.open();
		socketB.open();
		await assertPromiseResolved(promise, true);
		assertEquals(await promise, "foo");
	},
});

Deno.test({
	name: "sending rejects when the connection gives an error",
	async fn() {
		const { socketA, socketB } = createLinkedWebSockets({ open: false });
		const { messengerB } = createLinkedMessengers(socketA, socketB, {
			foo() {
				return "foo";
			},
		}, {});

		const promise = assertRejects(async () => {
			await messengerB.send.foo();
		}, Error, "Failed to connect to WebSocket.");
		await assertPromiseResolved(promise, false);
		socketB.error();
		await assertPromiseResolved(promise, true);
	},
});

Deno.test({
	name: "Errors while handling websocket messages are caught",
	fn() {
		const consoleSpy = stub(console, "error", () => {});

		try {
			const socket = new EventTarget();
			const castSocket = /** @type {WebSocket} */ (/** @type {unknown} */ (socket));
			const messenger = new TypedMessenger();
			messenger.initializeWebSocket(castSocket, {});
			socket.dispatchEvent(new MessageEvent("message", {
				data: "{this is not a json string",
			}));

			assertSpyCalls(consoleSpy, 1);
			assertEquals(consoleSpy.calls[0].args[0], "An error occurred while handling a websocket message.");
		} finally {
			consoleSpy.restore();
		}
	},
});
