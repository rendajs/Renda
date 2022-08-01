import {assertEquals, assertRejects} from "std/testing/asserts.ts";
import {TypedMessenger} from "../../../../src/util/TypedMessenger.js";

Deno.test({
	name: "Basic request",
	async fn() {
		const requestHandlers = {
			/**
			 * @param {number} num1
			 * @param {number} num2
			 */
			isHigher: (num1, num2) => num1 > num2,
			returnsTrue: () => true,
		};

		/** @type {TypedMessenger<typeof requestHandlers, {}>} */
		const messengerA = new TypedMessenger();
		/** @type {TypedMessenger<{}, typeof requestHandlers>} */
		const messengerB = new TypedMessenger();

		// Normally we would send the data to the worker
		// but since this is a test, we send it between the messengers directly.
		messengerA.setSendHandler(data => {
			messengerB.handleReceivedMessage(data);
		});
		messengerB.setSendHandler(data => {
			messengerA.handleReceivedMessage(data);
		});
		messengerB.setResponseHandlers(requestHandlers);

		const result1 = await messengerA.send("isHigher", 2, 1);
		assertEquals(result1, true);
		const result2 = await messengerA.send("isHigher", 1, 2);
		assertEquals(result2, false);

		/**
		 * Helper functions for verifying types.
		 * @param {string} str
		 */
		function takesString(str) {}

		// Verify that the parameter types are correct and not 'any':
		// @ts-expect-error
		await messengerA.send("isHigher", 2, "not a number");

		// Verify that the return type is boolean and not 'any':

		const result3 = await messengerA.send("returnsTrue");
		// @ts-expect-error
		takesString(result3);
		assertEquals(result3, true);

		// Verify that the send handler types are correct and not 'any':
		messengerA.setSendHandler(data => {
			if (data.direction == "request") {
				if (data.type == "isHigher") {
					// @ts-expect-error
					takesString(data.args);
					assertEquals(data.args, [2, 1]);
				}
			}
		});
		messengerB.setSendHandler(data => {
			if (data.direction == "response") {
				if (data.type == "isHigher") {
					// @ts-expect-error
					takesString(data.returnValue);
					assertEquals(data.returnValue, true);
				}
			}
		});
	},
});

Deno.test({
	name: "send() throws if no send handler has been set",
	async fn() {
		const messenger = new TypedMessenger();
		await assertRejects(async () => {
			await messenger.send("foo");
		}, Error, "Failed to send message, no send handler set. Make sure to call `setSendHandler` before sending messages.");
	},
});

Deno.test({
	name: "handleReceivedMessage() throws if no request handlers have been set",
	async fn() {
		const messenger = new TypedMessenger();
		await assertRejects(async () => {
			await messenger.handleReceivedMessage({
				direction: "request",
				type: "foo",
				id: 0,
				args: [],
			});
		}, Error, "Failed to handle message, no request handlers set. Make sure to call `setRequestHandlers` before handling messages.");
	},
});

Deno.test({
	name: "handleReceivedMessage() throws if no send handler has been set",
	async fn() {
		const messenger = new TypedMessenger();
		messenger.setResponseHandlers({
			foo: () => true,
		});
		await assertRejects(async () => {
			await messenger.handleReceivedMessage({
				direction: "request",
				type: "foo",
				id: 0,
				args: [],
			});
		}, Error, "Failed to handle message, no send handler set. Make sure to call `setSendHandler` before handling messages.");
	},
});

Deno.test({
	name: "Non existent handlers resolve with undefined",
	async fn() {
		const messengerA = new TypedMessenger();
		const messengerB = new TypedMessenger();
		messengerA.setSendHandler(data => {
			messengerB.handleReceivedMessage(data);
		});
		messengerB.setSendHandler(data => {
			messengerA.handleReceivedMessage(data);
		});
		messengerB.setResponseHandlers({});

		const result = await messengerA.send("foo");
		assertEquals(result, undefined);
	},
});

Deno.test({
	name: "An example using MessagePort",
	async fn() {
		const requestHandlers = {
			/**
			 * @param {number} x
			 */
			sameNum: x => x,
		};

		const channel = new MessageChannel();
		/** @type {TypedMessenger<typeof requestHandlers, {}>} */
		const messengerA = new TypedMessenger();
		/** @type {TypedMessenger<{}, typeof requestHandlers>} */
		const messengerB = new TypedMessenger();
		messengerA.setSendHandler(data => {
			channel.port2.postMessage(data);
		});
		messengerB.setSendHandler(data => {
			channel.port1.postMessage(data);
		});
		channel.port2.onmessage = e => {
			messengerA.handleReceivedMessage(e.data);
		};
		channel.port1.onmessage = e => {
			messengerB.handleReceivedMessage(e.data);
		};
		messengerB.setResponseHandlers(requestHandlers);

		const result = await messengerA.send("sameNum", 123);
		assertEquals(result, 123);

		channel.port1.close();
		channel.port2.close();
	},
});

Deno.test({
	name: "Thrown errors are passed on to the requester",
	async fn() {
		const requestHandlers = {
			throws: () => {
				throw new TypeError("Error message");
			},
		};

		const messengerA = new TypedMessenger();
		const messengerB = new TypedMessenger();
		messengerA.setSendHandler(data => {
			messengerB.handleReceivedMessage(data);
		});
		messengerB.setSendHandler(data => {
			messengerA.handleReceivedMessage(data);
		});
		messengerB.setResponseHandlers(requestHandlers);

		await assertRejects(async () => {
			await messengerA.send("throws");
		}, TypeError, "Error message");
	},
});

Deno.test({
	name: "Responding to requests in a different order than it was received",
	async fn() {
		const requestHandlers = {
			/**
			 * @param {number} x
			 */
			sameNum: x => x,
		};

		/** @type {TypedMessenger<typeof requestHandlers, {}>} */
		const messengerA = new TypedMessenger();
		/** @type {TypedMessenger<{}, typeof requestHandlers>} */
		const messengerB = new TypedMessenger();
		messengerA.setSendHandler(data => {
			messengerB.handleReceivedMessage(data);
		});
		/** @type {import("../../../../src/util/TypedMessenger.js").TypedMessengerMessage<{}, typeof requestHandlers>[]} */
		let requestQueue = [];
		messengerB.setSendHandler(data => {
			requestQueue.push(data);
			if (requestQueue.length === 2) {
				// Send the requests in the opposite order they were received:
				requestQueue.reverse().forEach(data => {
					messengerA.handleReceivedMessage(data);
				});
				requestQueue = [];
			}
		});
		messengerB.setResponseHandlers(requestHandlers);

		const promise1 = messengerA.send("sameNum", 123);
		const promise2 = messengerA.send("sameNum", 456);
		assertEquals(await promise1, 123);
		assertEquals(await promise2, 456);
	},
});
