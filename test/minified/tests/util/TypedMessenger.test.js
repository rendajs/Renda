import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import { TypedMessenger as MinifiedTypedMessenger } from "../../shared/minifiedRenda.js";
import { TypedMessenger } from "../../shared/unminifiedRenda.js";

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
		const castSendData = /** @type {import("../../shared/minifiedRenda.js").TypedMessengerMessageSendData<TServerHandlers, TClientHandlers>} */ (data.sendData);
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
		});
	},
});
