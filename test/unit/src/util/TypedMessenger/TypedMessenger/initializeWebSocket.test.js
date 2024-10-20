import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import { TypedMessenger } from "../../../../../../src/util/TypedMessenger/TypedMessenger.js";
import { assertSpyCalls, stub } from "std/testing/mock.ts";
import { assertPromiseResolved } from "../../../../../../src/util/asserts.js";
import { createLinkedMessengers, createLinkedWebSockets } from "./shared/websockets.js";
import { waitForMicrotasks } from "../../../../../../src/util/waitForMicroTasks.js";

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

Deno.test({
	name: "Errors due to websocket closing before a response message is sent are caught",
	async fn() {
		const consoleSpy = stub(console, "error", () => {});

		try {
			const { socketA, socketB } = createLinkedWebSockets();
			const { messengerB } = createLinkedMessengers(socketA, socketB, {
				foo() {
					return "foo";
				},
			}, {});
			socketA.close();
			const sendPromise = messengerB.send.foo();

			await waitForMicrotasks();
			assertSpyCalls(consoleSpy, 1);
			assertEquals(consoleSpy.calls[0].args[0], "An error occurred while handling a websocket message.");
			await assertPromiseResolved(sendPromise, false);
		} finally {
			consoleSpy.restore();
		}
	},
});
