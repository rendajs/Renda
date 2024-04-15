import { assertEquals, assertRejects, assertStrictEquals } from "std/testing/asserts.ts";
import { TypedMessenger as MinifiedTypedMessenger } from "../../shared/minifiedRenda.js";
import { TypedMessenger } from "../../shared/unminifiedRenda.js";
import { stub } from "std/testing/mock.ts";
import { createLinkedWebSockets } from "../../../unit/src/util/TypedMessenger/TypedMessenger/shared/websockets.js";

/**
 * Creates two typed messengers. One of which uses minified code (the client),
 * and another which doesn't (the server). This allows us to test that
 * message data doesn't get mangled accidentally.
 * @template {import("../../shared/minifiedRenda.js").TypedMessengerSignatures} TClientHandlers
 * @template {import("../../shared/minifiedRenda.js").TypedMessengerSignatures} TServerHandlers
 * @param {TClientHandlers} clientRequestHandlers
 * @param {TServerHandlers} serverRequestHandlers
 */
function createClientServerHandlerPair(clientRequestHandlers, serverRequestHandlers) {
	/** @type {TypedMessenger<TClientHandlers, TServerHandlers>} */
	const clientMessenger = new MinifiedTypedMessenger();
	/** @type {TypedMessenger<TServerHandlers, TClientHandlers>} */
	const serverMessenger = new TypedMessenger();

	clientMessenger.setSendHandler((data) => {
		const castSendData = /** @type {import("../../shared/minifiedRenda.js").TypedMessengerMessageSendData<TServerHandlers, TClientHandlers>} */ (data["sendData"]);
		serverMessenger["handleReceivedMessage"](castSendData);
	});
	serverMessenger["setSendHandler"]((data) => {
		const castSendData = /** @type {import("../../shared/minifiedRenda.js").TypedMessengerMessageSendData<TClientHandlers, TServerHandlers>} */ (data["sendData"]);
		clientMessenger.handleReceivedMessage(castSendData);
	});
	clientMessenger.setResponseHandlers(clientRequestHandlers);
	serverMessenger["setResponseHandlers"](serverRequestHandlers);
	return { clientMessenger, serverMessenger };
}

Deno.test({
	name: "Sending messages to a server",
	async fn() {
		const serverRequestHandlers = {
			/**
			 * @param {number} num1
			 * @param {number} num2
			 */
			isHigher: (num1, num2) => num1 > num2,
		};

		const { clientMessenger } = createClientServerHandlerPair({}, serverRequestHandlers);

		assertEquals(await clientMessenger.send.isHigher(1, 2), false);
		assertEquals(await clientMessenger.send.isHigher(3, 2), true);
	},
});

Deno.test({
	name: "Sending messages to a client",
	async fn() {
		const clientRequestHandlers = {
			/**
			 * @param {number} num1
			 * @param {number} num2
			 */
			isHigher: (num1, num2) => num1 > num2,
		};

		const { serverMessenger } = createClientServerHandlerPair(clientRequestHandlers, {});

		assertEquals(await serverMessenger.send.isHigher(1, 2), false);
		assertEquals(await serverMessenger.send.isHigher(3, 2), true);
	},
});

Deno.test({
	name: "A server handler that throws",
	async fn() {
		const serverRequestHandlers = {
			throws: () => {
				throw new Error("oh no");
			},
		};

		const { clientMessenger } = createClientServerHandlerPair({}, serverRequestHandlers);

		await assertRejects(async () => {
			await clientMessenger.send.throws();
		}, Error, "oh no");
	},
});

Deno.test({
	name: "A client handler that throws",
	async fn() {
		const clientRequestHandlers = {
			throws: () => {
				throw new Error("oh no");
			},
		};

		const { serverMessenger } = createClientServerHandlerPair(clientRequestHandlers, {});

		await assertRejects(async () => {
			await serverMessenger.send.throws();
		}, Error, "oh no");
	},
});

Deno.test({
	name: "initializeWorker()",
	async fn() {
		/** @type {Transferable[]} */
		const clientTransferredRefs = [];
		/** @type {Transferable[]} */
		const workerTransferredRefs = [];
		class FakeWorker extends EventTarget {
			/**
			 * @param {any} message
			 * @param {Transferable[]} [transfer]
			 */
			postMessage(message, transfer) {
				workerMessenger["handleReceivedMessage"](message);
				if (transfer) {
					for (const item of transfer) {
						clientTransferredRefs.push(item);
					}
				}
			}
		}
		const worker = /** @type {Worker} */ (new FakeWorker());

		const workerHandlers = {
			/**
			 * @param {ArrayBuffer} x
			 */
			bar: (x) => {
				/** @type {import("../../shared/unminifiedRenda.js").TypedMessengerRequestHandlerReturn} */
				const returnValue = {
					/* eslint-disable quote-props */
					"$respondOptions": {
						"transfer": [x],
						"returnValue": x,
					},
					/* eslint-enable quote-props */
				};
				return returnValue;
			},
		};
		/** @type {TypedMessenger<typeof workerHandlers, typeof clientHandlers>} */
		const workerMessenger = new TypedMessenger();
		workerMessenger["setResponseHandlers"](workerHandlers);
		workerMessenger["setSendHandler"]((data) => {
			for (const item of data["transfer"]) {
				workerTransferredRefs.push(item);
			}
			worker.dispatchEvent(new MessageEvent("message", {
				data: data["sendData"],
			}));
		});

		const clientHandlers = {
			/**
			 * @param {ArrayBuffer} x
			 */
			foo: (x) => {
				/** @type {import("../../shared/unminifiedRenda.js").TypedMessengerRequestHandlerReturn} */
				const returnValue = {
					$respondOptions: {
						transfer: [x],
						returnValue: x,
					},
				};
				return returnValue;
			},
		};
		/** @type {TypedMessenger<typeof clientHandlers, typeof workerHandlers>} */
		const clientMessenger = new MinifiedTypedMessenger();

		clientMessenger.initializeWorker(worker, clientHandlers);

		const objectA = new ArrayBuffer(0);
		const resultA = await workerMessenger["sendWithOptions"].foo({
			transfer: [objectA],
		}, objectA);
		assertStrictEquals(resultA, objectA);
		assertEquals(workerTransferredRefs.length, 1);
		assertStrictEquals(workerTransferredRefs[0], objectA);
		assertEquals(clientTransferredRefs.length, 1);
		assertStrictEquals(clientTransferredRefs[0], objectA);

		const objectB = new ArrayBuffer(0);
		const resultB = await clientMessenger.sendWithOptions.bar({
			transfer: [objectB],
		}, objectB);
		assertStrictEquals(resultB, objectB);
		assertEquals(workerTransferredRefs.length, 2);
		assertStrictEquals(workerTransferredRefs[1], objectB);
		assertEquals(clientTransferredRefs.length, 2);
		assertStrictEquals(clientTransferredRefs[1], objectB);
	},
});

Deno.test({
	name: "initializeWorkerContext()",
	async fn() {
		/** @type {Transferable[]} */
		const clientTransferredRefs = [];
		/** @type {Transferable[]} */
		const workerTransferredRefs = [];

		const clientHandlers = {
			/**
			 * @param {ArrayBuffer} x
			 */
			bar: (x) => {
				/** @type {import("../../shared/unminifiedRenda.js").TypedMessengerRequestHandlerReturn} */
				const returnValue = {
					/* eslint-disable quote-props */
					"$respondOptions": {
						"transfer": [x],
						"returnValue": x,
					},
					/* eslint-enable quote-props */
				};
				return returnValue;
			},
		};

		const workerHandlers = {
			/**
			 * @param {ArrayBuffer} x
			 */
			foo: (x) => {
				/** @type {import("../../shared/unminifiedRenda.js").TypedMessengerRequestHandlerReturn} */
				const returnValue = {
					$respondOptions: {
						transfer: [x],
						returnValue: x,
					},
				};
				return returnValue;
			},
		};

		/** @type {TypedMessenger<typeof clientHandlers, typeof workerHandlers>} */
		let clientMessenger;
		const postMessageStub = stub(globalThis, "postMessage", (message, options) => {
			clientMessenger["handleReceivedMessage"](message);
			if (options?.transfer) {
				for (const item of options.transfer) {
					clientTransferredRefs.push(item);
				}
			}
		});

		try {
			clientMessenger = new TypedMessenger();
			clientMessenger["setResponseHandlers"](clientHandlers);
			clientMessenger["setSendHandler"]((data) => {
				for (const item of data["transfer"]) {
					workerTransferredRefs.push(item);
				}
				globalThis.dispatchEvent(new MessageEvent("message", {
					data: data["sendData"],
				}));
			});

			/** @type {TypedMessenger<typeof workerHandlers, typeof clientHandlers>} */
			const workerMessenger = new MinifiedTypedMessenger();

			workerMessenger.initializeWorkerContext(workerHandlers);

			const objectA = new ArrayBuffer(0);
			const resultA = await clientMessenger["sendWithOptions"].foo({
				transfer: [objectA],
			}, objectA);
			assertStrictEquals(resultA, objectA);
			assertEquals(workerTransferredRefs.length, 1);
			assertStrictEquals(workerTransferredRefs[0], objectA);
			assertEquals(clientTransferredRefs.length, 1);
			assertStrictEquals(clientTransferredRefs[0], objectA);

			const objectB = new ArrayBuffer(0);
			const resultB = await workerMessenger.sendWithOptions.bar({
				transfer: [objectB],
			}, objectB);
			assertStrictEquals(resultB, objectB);
			assertEquals(workerTransferredRefs.length, 2);
			assertStrictEquals(workerTransferredRefs[1], objectB);
			assertEquals(clientTransferredRefs.length, 2);
			assertStrictEquals(clientTransferredRefs[1], objectB);
		} finally {
			postMessageStub.restore();
		}
	},
});

Deno.test({
	name: "initializeWebSocket()",
	async fn() {
		const clientHandlers = {
			/**
			 * @param {number} x
			 */
			foo: (x) => x,
		};

		const serverHandlers = {
			/**
			 * @param {number} x
			 */
			bar: (x) => x,
		};

		/** @type {TypedMessenger<typeof clientHandlers, typeof serverHandlers>} */
		const clientMessenger = new MinifiedTypedMessenger();

		/** @type {TypedMessenger<typeof serverHandlers, typeof clientHandlers>} */
		const serverMessenger = new TypedMessenger();

		const { socketA, socketB } = createLinkedWebSockets();

		clientMessenger.initializeWebSocket(socketA.castWebSocket(), clientHandlers);
		serverMessenger["initializeWebSocket"](socketB.castWebSocket(), serverHandlers);

		const resultA = await serverMessenger.send.foo(42);
		assertEquals(resultA, 42);

		const resultB = await clientMessenger.send.bar(42);
		assertEquals(resultB, 42);
	},
});
