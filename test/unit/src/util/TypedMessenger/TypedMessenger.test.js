import {assertEquals, assertRejects, assertStrictEquals} from "std/testing/asserts.ts";
import {TypedMessenger} from "../../../../../src/util/TypedMessenger.js";
import {assertIsType} from "../../../shared/typeAssertions.js";
import {assertSpyCalls, stub} from "std/testing/mock.ts";
import {FakeTime} from "std/testing/time.ts";
import {assertPromiseResolved} from "../../../shared/asserts.js";

/**
 * Directly links two TypedMessengers to each other without the use of a WebSocket or anything like that.
 * Normally this would be kind of pointless, since you likely want to communicate with a Worker or WebSocket,
 * but inside tests this is fine.
 * @template {import("../../../../../src/mod.js").TypedMessengerSignatures} AToBHandlers
 * @template {import("../../../../../src/mod.js").TypedMessengerSignatures} BToAHandlers
 * @param {TypedMessenger<AToBHandlers, BToAHandlers>} messengerA
 * @param {TypedMessenger<BToAHandlers, AToBHandlers>} messengerB
 */
function linkMessengers(messengerA, messengerB) {
	/** @type {import("../../../../../src/util/TypedMessenger.js").TypedMessengerMessage<BToAHandlers, AToBHandlers>[]} */
	const aToBMessages = [];
	/** @type {import("../../../../../src/util/TypedMessenger.js").TypedMessengerMessage<AToBHandlers, BToAHandlers>[]} */
	const bToAMessages = [];

	messengerA.setSendHandler(data => {
		aToBMessages.push(data);
		messengerB.handleReceivedMessage(/** @type {import("../../../../../src/mod.js").TypedMessengerMessageSendData<BToAHandlers, AToBHandlers>} */ (data.sendData));
	});
	messengerB.setSendHandler(data => {
		bToAMessages.push(data);
		messengerA.handleReceivedMessage(/** @type {import("../../../../../src/mod.js").TypedMessengerMessageSendData<AToBHandlers, BToAHandlers>} */ (data.sendData));
	});

	return {aToBMessages, bToAMessages};
}

Deno.test({
	name: "send proxy and sendWithOptionsProxy",
	async fn() {
		const requestHandlers = {
			/**
			 * @param {number} num1
			 * @param {number} num2
			 */
			isHigher: (num1, num2) => num1 > num2,
			returnsTrue: () => true,
			/**
			 * @param {number} num1
			 * @param {number} num2
			 */
			twoArgs: (num1, num2) => {},
			noArgs: () => {},
			returnsBool: () => true,
		};

		/** @type {TypedMessenger<{}, typeof requestHandlers>} */
		const messengerA = new TypedMessenger();
		/** @type {TypedMessenger<typeof requestHandlers, {}>} */
		const messengerB = new TypedMessenger();

		linkMessengers(messengerA, messengerB);
		messengerB.setResponseHandlers(requestHandlers);

		const result1 = await messengerA.send.isHigher(2, 1);
		assertEquals(result1, true);
		const result2 = await messengerA.send.isHigher(1, 2);
		assertEquals(result2, false);
		const result3 = await messengerA.sendWithOptions.isHigher({}, 2, 1);
		assertEquals(result3, true);
		const result4 = await messengerA.sendWithOptions.isHigher({}, 1, 2);
		assertEquals(result4, false);

		// @ts-expect-error Verify that the parameter types are correct and not 'any':
		await messengerA.send.isHigher(2, "not a number");

		const result5 = await messengerA.send.returnsTrue();
		// Verify that the return type is boolean and nothing else
		assertIsType(true, result5);
		// @ts-expect-error Verify that the return type is boolean and not 'any':
		assertIsType("", result5);
		assertEquals(result5, true);

		const result6 = await messengerA.sendWithOptions.returnsTrue({});
		// Verify that the return type is boolean and nothing else
		assertIsType(true, result6);
		// @ts-expect-error Verify that the return type is boolean and not 'any':
		assertIsType("", result6);
		assertEquals(result6, true);

		// Non existent functions can be called without any runtime errors,
		// because a TypedMessenger is not aware of the existing response handlers on the receiving end.
		// This is fine, these calls will simply resolve with undefined.
		// We'll want to make sure TypeScript warns us about calls to non existent functions though.
		// @ts-expect-error Verify that TypeScript emits an error when a non existent function is called
		messengerA.send.nonExistent();
		// @ts-expect-error Verify that TypeScript emits an error when a non existent function is called
		messengerA.sendWithOptions.nonExistent([]);

		// @ts-expect-error Verify that an error is emitted when too many arguments are passed.
		messengerA.send.noArgs("too", "many", "args");
		// @ts-expect-error Verify that an error is emitted when too many arguments are passed.
		messengerA.sendWithOptions.noArgs([], "too", "many", "args");

		// @ts-expect-error Verify that an error is emitted when too few arguments are passed.
		messengerA.send.twoArgs();
		// @ts-expect-error Verify that an error is emitted when too few arguments are passed.
		messengerA.sendWithOptions.twoArgs([]);
		// @ts-expect-error Verify that an error is emitted the transfer argument is missing.
		messengerA.sendWithOptions.twoArgs(1, 2);

		// @ts-expect-error Verify that an error is emitted when too many arguments are passed.
		messengerA.send.twoArgs(1, 2, 3);
		// @ts-expect-error Verify that an error is emitted when too many arguments are passed.
		messengerA.send.twoArgs([], 1, 2, 3);

		const expectedBoolPromise = Promise.resolve(true);

		const actualBoolPromise1 = messengerA.send.returnsBool();
		// Verify that the type is Promise<boolean> and nothing else
		assertIsType(expectedBoolPromise, actualBoolPromise1);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType("", actualBoolPromise1);

		const actualBoolPromise2 = messengerA.sendWithOptions.returnsBool({});
		// Verify that the type is Promise<boolean> and nothing else
		assertIsType(expectedBoolPromise, actualBoolPromise2);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType("", actualBoolPromise2);

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
	name: "sendWithOptions passes on the transfer property",
	async fn() {
		const requestHandlers = {
			/**
			 * @param {number} x
			 * @param {number} y
			 */
			needsTransfer: (x, y) => {},
		};

		/** @type {TypedMessenger<{}, typeof requestHandlers>} */
		const messengerA = new TypedMessenger();
		/** @type {TypedMessenger<typeof requestHandlers, {}>} */
		const messengerB = new TypedMessenger();

		const {aToBMessages: messages} = linkMessengers(messengerA, messengerB);
		messengerB.setResponseHandlers(requestHandlers);

		const transferObj = new ArrayBuffer(0);

		// Providing a transfer array should pass it on to the message data.
		await messengerA.sendWithOptions.needsTransfer({transfer: [transferObj]}, 1, 2);

		assertEquals(messages.length, 1);
		assertEquals(messages[0].sendData.args, [1, 2]);
		assertEquals(messages[0].transfer.length, 1);
		assertStrictEquals(messages[0].transfer[0], transferObj);

		// Providing an empty options object should result in an empty transfer array
		await messengerA.sendWithOptions.needsTransfer({}, 3, 4);

		assertEquals(messages.length, 2);
		assertEquals(messages[1].sendData.args, [3, 4]);
		assertEquals(messages[1].transfer.length, 0);

		// Providing no options at all should result in an empty transfer array
		await messengerA.send.needsTransfer(5, 6);

		assertEquals(messages.length, 3);
		assertEquals(messages[2].sendData.args, [5, 6]);
		assertEquals(messages[2].transfer.length, 0);
	},
});

Deno.test({
	name: "respondOptions passes on the transfer property",
	async fn() {
		const transferObj = new ArrayBuffer(0);
		const requestHandlers = {
			returnsTransfer() {
				return {
					$respondOptions: {
						transfer: [transferObj],
					},
				};
			},
			returnsEmptyTransfer() {
				return {
					$respondOptions: {
						transfer: [],
					},
				};
			},
			returnsNoTransfer() {
				return {
					$respondOptions: {},
				};
			},
			returnsNoOptions() {
				return true;
			},
		};

		/** @type {TypedMessenger<{}, typeof requestHandlers>} */
		const messengerA = new TypedMessenger();
		/** @type {TypedMessenger<typeof requestHandlers, {}>} */
		const messengerB = new TypedMessenger();

		const {bToAMessages: messages} = linkMessengers(messengerA, messengerB);
		messengerB.setResponseHandlers(requestHandlers);

		// Providing a transfer array should pass it on to the message data.
		await messengerA.send.returnsTransfer();

		assertEquals(messages.length, 1);
		assertEquals(messages[0].transfer.length, 1);
		assertStrictEquals(messages[0].transfer[0], transferObj);

		// Providing an empty array should result in an empty transfer array
		await messengerA.send.returnsEmptyTransfer();

		assertEquals(messages.length, 2);
		assertEquals(messages[1].transfer.length, 0);

		// Providing an empty options object should result in an empty transfer array
		await messengerA.send.returnsNoTransfer();

		assertEquals(messages.length, 3);
		assertEquals(messages[2].transfer.length, 0);

		// Providing no options at all should result in an empty transfer array
		await messengerA.send.returnsNoOptions();

		assertEquals(messages.length, 4);
		assertEquals(messages[3].transfer.length, 0);
	},
});

Deno.test({
	name: "sending throws if no send handler has been set",
	async fn() {
		const messenger = new TypedMessenger();
		await assertRejects(async () => {
			await messenger.send.foo();
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
		linkMessengers(messengerA, messengerB);
		messengerB.setResponseHandlers({});

		const result = await messengerA.send.foo();
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
		/** @type {TypedMessenger<{}, typeof requestHandlers>} */
		const messengerA = new TypedMessenger();
		/** @type {TypedMessenger<typeof requestHandlers, {}>} */
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

		const result = await messengerA.send.sameNum(123);
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
		linkMessengers(messengerA, messengerB);
		messengerB.setResponseHandlers(requestHandlers);

		await assertRejects(async () => {
			await messengerA.send.throws();
		}, TypeError, "Error message");

		await assertRejects(async () => {
			await messengerA.sendWithOptions.throws({timeout: 1000});
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

		/** @type {TypedMessenger<{}, typeof requestHandlers>} */
		const messengerA = new TypedMessenger();
		/** @type {TypedMessenger<typeof requestHandlers, {}>} */
		const messengerB = new TypedMessenger();
		messengerA.setSendHandler(data => {
			messengerB.handleReceivedMessage(data.sendData);
		});
		/** @type {import("../../../../../src/util/TypedMessenger.js").TypedMessengerMessage<{}, typeof requestHandlers>[]} */
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

		const promise1 = messengerA.send.sameNum(123);
		const promise2 = messengerA.send.sameNum(456);
		assertEquals(await promise1, 123);
		assertEquals(await promise2, 456);
	},
});

Deno.test({
	name: "response with respondOptions",
	async fn() {
		const requestHandlers = {
			returnsTrue: () => {
				return {
					$respondOptions: {
						returnValue: true,
					},
				};
			},
			/**
			 * @param {number} num1
			 * @param {number} num2
			 */
			isHigher: (num1, num2) => {
				return {
					$respondOptions: {
						returnValue: num1 > num2,
					},
				};
			},
			noOptions: () => {},
			noReturnValue: () => {
				return {
					$respondOptions: {},
				};
			},
			returnsPromise: async () => {
				return {
					$respondOptions: {
						returnValue: "return value",
					},
				};
			},
			maybeOptions() {
				const condition = /** @type {boolean} */ (true);
				if (condition) {
					return /** @type {const} */ ("no options");
				}
				return {
					$respondOptions: {
						returnValue: /** @type {const} */ ("options"),
					},
				};
			},
		};

		/** @type {TypedMessenger<{}, typeof requestHandlers>} */
		const messengerA = new TypedMessenger();
		/** @type {TypedMessenger<typeof requestHandlers, {}>} */
		const messengerB = new TypedMessenger();
		linkMessengers(messengerA, messengerB);
		messengerB.setResponseHandlers(requestHandlers);

		const result1 = await messengerA.send.isHigher(2, 1);
		assertEquals(result1, true);
		const result2 = await messengerA.send.isHigher(1, 2);
		assertEquals(result2, false);

		// Verify that the return type is boolean and nothing else
		assertIsType(true, result1);
		// @ts-expect-error Verify that the return type is boolean and not 'any':
		assertIsType("", result1);

		// Verify that the parameter types are correct and not 'any':
		// @ts-expect-error
		await messengerA.send.isHigher(2, "not a number");

		const result3 = await messengerA.send.returnsTrue();
		assertEquals(result3, true);

		// Verify that the return type is boolean and nothing else
		assertIsType(true, result3);
		// @ts-expect-error Verify that the return type is boolean and not 'any':
		assertIsType("", result3);

		// Verify that the return type is void for functions with no returnValue in the options:
		const result4 = await messengerA.send.noReturnValue();
		assertEquals(result4, undefined);

		// Verify that the return type is void and nothing else
		const voidType = (() => {})();
		assertIsType(voidType, result4);
		// @ts-expect-error Verify that the return type is void and not 'any':
		assertIsType("", result4);

		// Verify that the return type is void for functions that don't return anything:
		const result5 = await messengerA.send.noOptions();
		assertEquals(result5, undefined);

		// Verify that the return type is void and nothing else
		assertIsType(voidType, result5);
		// @ts-expect-error Verify that the return type is void and not 'any':
		assertIsType("", result5);

		const result6 = await messengerA.send.returnsPromise();
		assertEquals(result6, "return value");

		// Verify that the return type is string and nothing else
		assertIsType("", result6);
		// @ts-expect-error Verify that the return type is string and not 'any':
		assertIsType(true, result6);

		const result7 = await messengerA.send.maybeOptions();

		// Verify that the return type is "options" | "no options" and nothing else
		const optionsNoOptions = /** @type {"options" | "no options"} */ ("");
		assertIsType(optionsNoOptions, result7);
		assertIsType(result7, "no options");
		assertIsType(result7, "options");
		// @ts-expect-error Verify that the return type is string and not 'any':
		assertIsType(true, result7);

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

/** @typedef {typeof workerWithInitializeHandlers} WorkerWithInitializeHandlers */

const workerWithInitializeHandlers = {
	/**
	 * @param {ArrayBuffer} arr
	 */
	foo(arr) {
		return {
			$respondOptions: {
				returnValue: {arr},
				transfer: [arr],
			},
		};
	},
};

Deno.test({
	name: "initializeWorker() with respondOptions and transfer array",
	async fn() {
		const url = new URL("./shared/workerWithInitialize.js", import.meta.url);
		const worker = new Worker(url.href, {type: "module"});

		try {
			/** @type {TypedMessenger<WorkerWithInitializeHandlers, import("./shared/workerWithInitialize.js").WorkerWithInitializeHandlers>} */
			const messenger = new TypedMessenger();
			messenger.initializeWorker(worker, workerWithInitializeHandlers);

			const view = new Uint8Array([1, 2, 3]);
			const arr = view.buffer;
			const result = await messenger.send.bar(arr);
			const newView = new Uint8Array(result.arr);
			assertEquals([...newView], [1, 2, 3]);
		} finally {
			worker.terminate();
		}
	},
});

Deno.test({
	name: "Serializing and deserializing errors",
	async fn() {
		class MyError extends Error {
			/**
			 * @param {string} message
			 */
			constructor(message) {
				super(message);
				this.name = "MyError";
			}
		}

		class UnhandledError extends Error {
			/**
			 * @param {string} message
			 */
			constructor(message) {
				super(message);
				this.name = "UnhandledError";
			}
		}

		const handlers = {
			throwMyError() {
				throw new MyError("Error message");
			},
			throwError() {
				throw new Error("Error message");
			},
			throwUnhandledError() {
				throw new UnhandledError("Error message");
			},
		};

		/** @type {TypedMessenger<typeof handlers, {}>} */
		const messengerA = new TypedMessenger({
			serializeErrorHook(error) {
				if (error instanceof MyError) {
					return {
						type: "myError",
						message: error.message,
					};
				} else if (error instanceof UnhandledError) {
					// In this test we're explicitly returning 'undefined',
					// but this meant to test a case where the user forgets to handle and return an error.
					return undefined;
				}
				return error;
			},
		});

		/**
		 * @typedef SerializedError
		 * @property {string} type
		 * @property {string} message
		 */

		/** @type {TypedMessenger<{}, typeof handlers>} */
		const messengerB = new TypedMessenger({
			deserializeErrorHook: error => {
				if (error) {
					const castError = /** @type {SerializedError} */ (error);
					if (castError.type == "myError") {
						return new MyError(castError.message);
					}
				}
				return error;
			},
		});

		/**
		 * @param {any} data
		 */
		function serialize(data) {
			return JSON.parse(JSON.stringify(data));
		}

		linkMessengers(messengerA, messengerB);
		messengerA.setSendHandler(data => {
			messengerB.handleReceivedMessage(serialize(data.sendData));
		});
		messengerB.setSendHandler(data => {
			messengerA.handleReceivedMessage(serialize(data.sendData));
		});
		messengerA.setResponseHandlers(handlers);

		// When dealing with workers, `Error` objects are serialized for us.
		// However, in this test we're serializing using JSON.parse. In that case errors are flattened to `{}`.
		const rejectValue1 = await assertRejects(async () => {
			await messengerB.send.throwError();
		});
		assertEquals(rejectValue1, {});

		// The hooks contain serialization logic for MyError.
		await assertRejects(async () => {
			await messengerB.send.throwMyError();
		}, MyError, "Error message");

		// But no logic for UnhandledError, so it should be undefined.
		const rejectValue2 = await assertRejects(async () => {
			await messengerB.send.throwUnhandledError();
		});
		assertEquals(rejectValue2, undefined);
	},
});

Deno.test({
	name: "initializeWebSocket()",
	async fn() {
		class FakeWebSocket extends EventTarget {
			/** @type {FakeWebSocket?} */
			#otherSocket = null;

			/**
			 * @param {string} data
			 */
			send(data) {
				this.#otherSocket?.dispatchEvent(new MessageEvent("message", {
					data,
				}));
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

		const socketA = new FakeWebSocket();
		const socketB = new FakeWebSocket();
		socketA.attachOther(socketB);
		socketB.attachOther(socketA);

		const messengerA = new TypedMessenger();
		const messengerB = new TypedMessenger();
		messengerA.initializeWebSocket(socketA.castWebSocket(), {
			foo() {
				return "foo";
			},
		});
		messengerB.initializeWebSocket(socketB.castWebSocket(), {});

		const result = await messengerB.send.foo();
		assertEquals(result, "foo");
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
	name: "respond false doesn't send a response",
	async fn() {
		const handlersB = {
			noResponse() {
				return /** @satisfies {import("../../../../../src/mod.js").TypedMessengerRequestHandlerReturn} */ ({
					$respondOptions: {
						respond: false,
					},
				});
			},
		};
		/** @type {TypedMessenger<{}, handlersB>} */
		const messengerA = new TypedMessenger();
		/** @type {TypedMessenger<handlersB, {}>} */
		const messengerB = new TypedMessenger();
		messengerB.setResponseHandlers(handlersB);
		const {aToBMessages, bToAMessages} = linkMessengers(messengerA, messengerB);

		const promise = messengerA.send.noResponse();

		await assertPromiseResolved(promise, false);

		assertEquals(aToBMessages.length, 1);
		assertEquals(bToAMessages.length, 0);

		const promiseNever = /** @type {Promise<never>} */ (Promise.resolve());
		assertIsType(promiseNever, promise);
	},
});

Deno.test({
	name: "Send promise stays pending forever when no timeout is set",
	async fn() {
		const messenger = new TypedMessenger();
		messenger.setSendHandler(() => {});

		const promise = messenger.send.foo();
		await assertPromiseResolved(promise, false);
	},
});

Deno.test({
	name: "Send promise rejects when timeout is reached",
	async fn() {
		const time = new FakeTime();

		try {
			const messenger = new TypedMessenger();
			messenger.setSendHandler(() => {});

			const assertRejectsPromise = assertRejects(async () => {
				await messenger.sendWithOptions.foo({timeout: 10_000});
			}, Error, "TypedMessenger response timed out.");

			await time.tickAsync(9_000);
			const assertResolved1 = assertPromiseResolved(assertRejectsPromise, false);
			await time.nextAsync();
			await assertResolved1;

			await time.tickAsync(2_000);
			const assertResolved2 = assertPromiseResolved(assertRejectsPromise, true);
			await time.nextAsync();
			await assertResolved2;
			await assertRejectsPromise;
		} finally {
			time.restore();
		}
	},
});

Deno.test({
	name: "Send promise rejects when global timeout is reached",
	async fn() {
		const time = new FakeTime();

		try {
			const messenger = new TypedMessenger({globalTimeout: 10_000});
			messenger.setSendHandler(() => {});

			const assertRejectsPromise1 = assertRejects(async () => {
				await messenger.send.foo();
			}, Error, "TypedMessenger response timed out.");

			// Changing the timeout doesn't affect existing requests.
			messenger.globalTimeout = 5_000;

			await time.tickAsync(9_000);
			const assertResolved1 = assertPromiseResolved(assertRejectsPromise1, false);
			await time.nextAsync();
			await assertResolved1;

			await time.tickAsync(2_000);
			const assertResolved2 = assertPromiseResolved(assertRejectsPromise1, true);
			await time.nextAsync();
			await assertResolved2;
			await assertRejectsPromise1;

			// But new requests do use the new global timeout value
			const assertRejectsPromise2 = assertRejects(async () => {
				await messenger.send.foo();
			}, Error, "TypedMessenger response timed out.");

			await time.tickAsync(4_000);
			const assertResolved3 = assertPromiseResolved(assertRejectsPromise2, false);
			await time.nextAsync();
			await assertResolved3;

			await time.tickAsync(2_000);
			const assertResolved4 = assertPromiseResolved(assertRejectsPromise2, true);
			await time.nextAsync();
			await assertResolved4;
			await assertRejectsPromise2;
		} finally {
			time.restore();
		}
	},
});

Deno.test({
	name: "Timeout error is fired on handlers with no response",
	async fn() {
		const time = new FakeTime();

		try {
			const handlersB = {
				noResponse() {
					return /** @satisfies {import("../../../../../src/mod.js").TypedMessengerRequestHandlerReturn} */ ({
						$respondOptions: {
							respond: false,
						},
					});
				},
			};
			/** @type {TypedMessenger<{}, handlersB>} */
			const messengerA = new TypedMessenger({globalTimeout: 10_000});
			/** @type {TypedMessenger<handlersB, {}>} */
			const messengerB = new TypedMessenger();
			messengerB.setResponseHandlers(handlersB);
			linkMessengers(messengerA, messengerB);

			const assertRejectsPromise1 = assertRejects(async () => {
				await messengerA.send.noResponse();
			}, Error, "TypedMessenger response timed out.");

			await time.tickAsync(9_000);
			const assertResolved1 = assertPromiseResolved(assertRejectsPromise1, false);
			await time.nextAsync();
			await assertResolved1;

			await time.tickAsync(2_000);
			const assertResolved2 = assertPromiseResolved(assertRejectsPromise1, true);
			await time.nextAsync();
			await assertResolved2;
			await assertRejectsPromise1;
		} finally {
			time.restore();
		}
	},
});

Deno.test({
	name: "Send promise does not reject when it responds in time",
	async fn() {
		const time = new FakeTime();

		try {
			const messengerA = new TypedMessenger();
			const messengerB = new TypedMessenger();
			linkMessengers(messengerA, messengerB);
			messengerB.setResponseHandlers({
				foo() {},
			});

			const sendPromise = messengerA.sendWithOptions.foo({timeout: 10_000});
			await time.tickAsync(5_000);
			const assertResolvedPromise = assertPromiseResolved(sendPromise, true);
			await time.nextAsync();
			await assertResolvedPromise;
			await sendPromise;
		} finally {
			time.restore();
		}
	},
});

Deno.test({
	name: "Timeouts are cleared when a response is received",
	async fn() {
		const messengerA = new TypedMessenger();
		const messengerB = new TypedMessenger();
		linkMessengers(messengerA, messengerB);
		messengerB.setResponseHandlers({
			foo() {},
		});

		await messengerA.sendWithOptions.foo({timeout: 10_000});

		// The Deno test runner will verify if the timeout was cleared using its test sanitizers.
	},
});

Deno.test({
	name: "expectResponse: false stays pending forever",
	async fn() {
		const messengerA = new TypedMessenger();
		const messengerB = new TypedMessenger();
		linkMessengers(messengerA, messengerB);
		messengerB.setResponseHandlers({
			foo() {},
		});

		const promise1 = messengerA.sendWithOptions.foo({expectResponse: false});
		await assertPromiseResolved(promise1, false);

		const promise2 = messengerA.sendWithOptions.foo({expectResponse: true});
		await assertPromiseResolved(promise2, true);
	},
});

Deno.test({
	name: "timeout is ignored when expectResponse is false",
	async fn() {
		const time = new FakeTime();

		try {
			const messenger = new TypedMessenger();
			messenger.setSendHandler(() => {});

			const sendPromise = messenger.sendWithOptions.foo({expectResponse: false, timeout: 10_000});

			await time.tickAsync(11_000);
			const assertResolved1 = assertPromiseResolved(sendPromise, false);
			await time.nextAsync();
			await assertResolved1;
		} finally {
			time.restore();
		}
	},
});

Deno.test({
	name: "Configuring send options via configureSendOptions()",
	async fn() {
		const time = new FakeTime();

		try {
			const messenger = new TypedMessenger({globalTimeout: 5000});
			messenger.setSendHandler(() => {});

			messenger.configureSendOptions({
				foo: {
					timeout: 1000, // Lower than the global
				},
				bar: {
					timeout: 10_000, // Higher than the global
				},
				baz: {
					expectResponse: false, // Should disable the timeout
				},
			});

			// foo()
			const assertFooPromise = assertRejects(async () => {
				await messenger.send.foo();
			}, Error, "TypedMessenger response timed out.");

			await time.tickAsync(500);
			const assertFooResolved = assertPromiseResolved(assertFooPromise, false);
			await time.nextAsync();
			await assertFooResolved;

			await time.tickAsync(1000);
			await assertFooPromise;

			// bar()
			const assertBarPromise = assertRejects(async () => {
				await messenger.send.bar();
			}, Error, "TypedMessenger response timed out.");

			await time.tickAsync(9_500);
			const assertBarResolved = assertPromiseResolved(assertBarPromise, false);
			await time.nextAsync();
			await assertBarResolved;

			await time.tickAsync(1000);
			await assertBarPromise;

			// baz()
			const bazPromise = messenger.send.baz();
			await time.tickAsync(10_000);
			const assertBazResolved = assertPromiseResolved(bazPromise, false);
			await time.nextAsync();
			await assertBazResolved;
		} finally {
			time.restore();
		}
	},
});
