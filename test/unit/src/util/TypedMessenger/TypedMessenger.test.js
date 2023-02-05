import {assertEquals, assertRejects} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, stub} from "std/testing/mock.ts";
import {TypedMessenger} from "../../../../../src/util/TypedMessenger.js";
import {assertIsType} from "../../../../shared/typeAssertions.js";

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
			messengerB.handleReceivedMessage(data.sendData);
		});
		messengerB.setSendHandler(data => {
			messengerA.handleReceivedMessage(data.sendData);
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
			if (data.sendData.direction == "request") {
				if (data.sendData.type == "isHigher") {
					// @ts-expect-error
					takesString(data.sendData.args);
					assertEquals(data.sendData.args, [2, 1]);
				}
			}
		});
		messengerB.setSendHandler(data => {
			if (data.sendData.direction == "response") {
				if (data.sendData.type == "isHigher") {
					// @ts-expect-error
					takesString(data.sendData.returnValue);
					assertEquals(data.sendData.returnValue, true);
				}
			}
		});
	},
});

Deno.test({
	name: "Send using proxy",
	async fn() {
		// eslint-disable-next-line no-unused-vars
		const requestHandlers = {
			/**
			 * @param {number} num1
			 * @param {number} num2
			 */
			twoArgs: (num1, num2) => {},
			noArgs: () => {},
			returnsBool: () => true,
		};

		/** @type {TypedMessenger<typeof requestHandlers, {}>} */
		const messenger = new TypedMessenger();

		const sendSpy = stub(messenger, "send", async () => {});

		messenger.proxy.twoArgs(1, 2);
		assertSpyCalls(sendSpy, 1);
		assertSpyCall(sendSpy, 0, {
			args: ["twoArgs", 1, 2],
		});

		messenger.proxy.noArgs();
		assertSpyCalls(sendSpy, 2);
		assertSpyCall(sendSpy, 1, {
			args: ["noArgs"],
		});

		// Non existent functions can be called without any runtime errors,
		// because a TypedMessenger is not aware of the existing response handlers on the receiving end.
		// This is fine, these calls will simply resolve with undefined.
		// We'll want to make sure TypeScript warns us about calls to non existent functions though.
		// @ts-expect-error Verify that TypeScript emits an error when a non existent function is called
		messenger.proxy.nonExistent();

		// @ts-expect-error Verify that an error is emitted when too many arguments are passed.
		messenger.proxy.noArgs("too", "many", "args");

		// @ts-expect-error Verify that an error is emitted when too few arguments are passed.
		messenger.proxy.twoArgs();

		// @ts-expect-error Verify that an error is emitted when too few arguments are passed.
		messenger.proxy.twoArgs(1, 2, 3);

		const expectedBoolPromise = Promise.resolve(true);
		const actualBoolPromise = messenger.proxy.returnsBool();

		// Verify that the type is Promise<boolean> and nothing else
		assertIsType(expectedBoolPromise, actualBoolPromise);

		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType("", actualBoolPromise);
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
			messengerB.handleReceivedMessage(data.sendData);
		});
		messengerB.setSendHandler(data => {
			messengerA.handleReceivedMessage(data.sendData);
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
			channel.port2.postMessage(data.sendData);
		});
		messengerB.setSendHandler(data => {
			channel.port1.postMessage(data.sendData);
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
			messengerB.handleReceivedMessage(data.sendData);
		});
		messengerB.setSendHandler(data => {
			messengerA.handleReceivedMessage(data.sendData);
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
			messengerB.handleReceivedMessage(data.sendData);
		});
		/** @type {import("../../../../../src/util/TypedMessenger.js").TypedMessengerMessage<{}, typeof requestHandlers, false>[]} */
		let requestQueue = [];
		messengerB.setSendHandler(data => {
			requestQueue.push(data);
			if (requestQueue.length === 2) {
				// Send the requests in the opposite order they were received:
				requestQueue.reverse().forEach(data => {
					messengerA.handleReceivedMessage(data.sendData);
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

Deno.test({
	name: "transferSupport: true",
	async fn() {
		const requestHandlers = {
			returnsTrue: () => {
				return {
					returnValue: true,
				};
			},
			/**
			 * @param {number} num1
			 * @param {number} num2
			 */
			isHigher: (num1, num2) => {
				return {
					returnValue: num1 > num2,
				};
			},
			noReturnValue: () => {},
			returnsPromise: async () => {
				return {
					returnValue: true,
				};
			},
		};

		/** @type {TypedMessenger<typeof requestHandlers, {}, true>} */
		const messengerA = new TypedMessenger({returnTransferSupport: true});
		/** @type {TypedMessenger<{}, typeof requestHandlers, true>} */
		const messengerB = new TypedMessenger({returnTransferSupport: true});
		messengerA.setSendHandler(data => {
			messengerB.handleReceivedMessage(data.sendData);
		});
		messengerB.setSendHandler(data => {
			messengerA.handleReceivedMessage(data.sendData);
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

		// Verify that the return type is void for functions that don't return anything:
		const result4 = await messengerA.send("noReturnValue");
		// @ts-expect-error
		takesString(result4);
		assertEquals(result4, undefined);

		const result5 = await messengerA.send("returnsPromise");
		// @ts-expect-error
		takesString(result5);
		assertEquals(result5, true);

		// Verify that the send handler types are correct and not 'any':
		messengerA.setSendHandler(data => {
			if (data.sendData.direction == "request") {
				if (data.sendData.type == "isHigher") {
					// @ts-expect-error
					takesString(data.sendData.args);
					assertEquals(data.sendData.args, [2, 1]);
				}
			}
		});
		messengerB.setSendHandler(data => {
			if (data.sendData.direction == "response") {
				if (data.sendData.type == "isHigher") {
					// @ts-expect-error
					takesString(data.sendData.returnValue);
					assertEquals(data.sendData.returnValue, true);
				}
			}
		});
	},
});

Deno.test({
	name: "Thrown errors are passed on to the requester with transferSupport: true",
	async fn() {
		const requestHandlers = {
			throws: () => {
				throw new TypeError("Error message");
			},
		};

		const messengerA = new TypedMessenger({returnTransferSupport: true});
		const messengerB = new TypedMessenger({returnTransferSupport: true});
		messengerA.setSendHandler(data => {
			messengerB.handleReceivedMessage(data.sendData);
		});
		messengerB.setSendHandler(data => {
			messengerA.handleReceivedMessage(data.sendData);
		});
		messengerB.setResponseHandlers(requestHandlers);

		await assertRejects(async () => {
			await messengerA.send("throws");
		}, TypeError, "Error message");
	},
});

/** @typedef {typeof workerWithInitializeHandlers} WorkerWithInitializeHandlers */

const workerWithInitializeHandlers = {
	/**
	 * @param {ArrayBuffer} arr
	 */
	foo(arr) {
		return {
			returnValue: {arr},
			transfer: [arr],
		};
	},
};

Deno.test({
	name: "initialize() with transferSupport: true",
	async fn() {
		const url = new URL("./shared/workerWithInitialize.js", import.meta.url);
		const worker = new Worker(url.href, {type: "module"});

		try {
			/** @type {TypedMessenger<import("./shared/workerWithInitialize.js").WorkerWithInitializeHandlers, WorkerWithInitializeHandlers, true>} */
			const messenger = new TypedMessenger({returnTransferSupport: true});
			messenger.initialize(worker, workerWithInitializeHandlers);

			const view = new Uint8Array([1, 2, 3]);
			const arr = view.buffer;
			const result = await messenger.send("bar", arr);
			const newView = new Uint8Array(result.arr);
			assertEquals([...newView], [1, 2, 3]);
		} finally {
			worker.terminate();
		}
	},
});

Deno.test({
	name: "Passing an incorrect response handler with transferSupport: true should emit a type error",
	async fn() {
		/** @typedef {typeof handlers} Handlers */
		const handlers = {
			fooSync() {
				return "incorrect type";
			},
			async fooAsync() {
				return "incorrect type";
			},
		};

		/** @type {TypedMessenger<Handlers, Handlers, true>} */
		const messenger = new TypedMessenger({returnTransferSupport: true});
		// @ts-expect-error
		messenger.setResponseHandlers(handlers);
		messenger.setResponseHandlers({
			// @ts-expect-error fooSync should have type never and cause a type error
			fooSync() {
				return "incorrect type";
			},
			// @ts-expect-error fooAsync should have type never and cause a type error
			async fooAsync() {
				return "incorrect type";
			},
		});
		const mockWorker = /** @type {Worker} */ ({
			addEventListener: /** @type {Worker["addEventListener"]} */ (() => {}),
			postMessage(message, options) {},
		});
		// @ts-expect-error
		messenger.initialize(mockWorker, handlers);
		messenger.initialize(mockWorker, {
			// @ts-expect-error fooSync should have type never and cause a type error
			fooSync() {
				return "incorrect type";
			},
			// @ts-expect-error fooAsync should have type never and cause a type error
			async fooAsync() {
				return "incorrect type";
			},
		});
	},
});
