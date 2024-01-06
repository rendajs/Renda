import {assert, assertEquals, assertInstanceOf, assertRejects} from "std/testing/asserts.ts";
import {StudioConnection} from "../../../../../src/network/studioConnections/StudioConnection.js";
import {assertSpyCalls} from "std/testing/mock.ts";
import {ExtendedMessageHandler, connectMessageHandlers} from "./shared.js";

Deno.test({
	name: "Exposes properties from the message handler",
	fn() {
		const connection = new StudioConnection(new ExtendedMessageHandler(), {});
		assertEquals(connection.otherClientUuid, "otherClientUuid");
		assertEquals(connection.clientType, "inspector");
		assertEquals(connection.connectionType, "testConnectionType");
		assertEquals(connection.initiatedByMe, false);
		assertEquals(connection.projectMetadata, {
			fileSystemHasWritePermissions: true,
			name: "test project name",
			uuid: "test project uuid",
		});
		assertEquals(connection.status, "connecting");
	},
});

Deno.test({
	name: "Calling close closes the message handler",
	fn() {
		const handler = new ExtendedMessageHandler();
		const connection = new StudioConnection(handler, {});
		connection.close();
		assertSpyCalls(handler.closeSpy, 1);
	},
});

Deno.test({
	name: "Messages are directly passed to the other end when serialization is supported",
	async fn() {
		const messageHandlerA = new ExtendedMessageHandler({supportsSerialization: true});
		new StudioConnection(messageHandlerA, {
			reliableResponseHandlers: {
				/**
				 * @param {number} num
				 */
				foo: num => num,
			},
		});

		const messageHandlerB = new ExtendedMessageHandler({supportsSerialization: true});
		const connectionB = new StudioConnection(messageHandlerB, {});

		connectMessageHandlers(messageHandlerA, messageHandlerB);

		const result = await connectionB.messenger.send.foo(42);
		assertEquals(result, 42);

		assertSpyCalls(messageHandlerA.sendSpy, 1);
		assert(!(messageHandlerA.sendSpy.calls[0].args[0] instanceof ArrayBuffer));
		assertSpyCalls(messageHandlerB.sendSpy, 1);
		assert(!(messageHandlerB.sendSpy.calls[0].args[0] instanceof ArrayBuffer));
	},
});

Deno.test({
	name: "Messages are serialized to json when serialization is not supported",
	async fn() {
		const messageHandlerA = new ExtendedMessageHandler();
		new StudioConnection(messageHandlerA, {
			reliableResponseHandlers: {
				/**
				 * @param {number} num
				 */
				foo: num => num,
			},
		});

		const messageHandlerB = new ExtendedMessageHandler();
		const connectionB = new StudioConnection(messageHandlerB, {});

		connectMessageHandlers(messageHandlerA, messageHandlerB);

		const result = await connectionB.messenger.send.foo(42);
		assertEquals(result, 42);

		assertSpyCalls(messageHandlerA.sendSpy, 1);
		assertInstanceOf(messageHandlerA.sendSpy.calls[0].args[0], ArrayBuffer);
		assertSpyCalls(messageHandlerB.sendSpy, 1);
		assertInstanceOf(messageHandlerB.sendSpy.calls[0].args[0], ArrayBuffer);
	},
});

Deno.test({
	name: "Requests are serialized and deserialized when hooks are specified",
	async fn() {
		const messageHandlerA = new ExtendedMessageHandler();
		new StudioConnection(messageHandlerA, {
			reliableResponseHandlers: {
				/**
				 * @param {number} num
				 */
				foo: num => num,
			},
			requestDeserializers: {
				foo: buffer => {
					const view = new DataView(buffer);
					return [view.getUint8(0)];
				},
			},
		});

		const messageHandlerB = new ExtendedMessageHandler();
		const connectionB = new StudioConnection(messageHandlerB, {
			requestSerializers: {
				/**
				 * @param {number} num
				 */
				foo: num => {
					const buffer = new ArrayBuffer(1);
					const view = new DataView(buffer);
					view.setUint8(0, num);
					return buffer;
				},
			},
		});

		connectMessageHandlers(messageHandlerA, messageHandlerB);

		const result = await connectionB.messenger.send.foo(42);
		assertEquals(result, 42);
		const result2 = await connectionB.messenger.send.foo(513);
		assertEquals(result2, 1);
	},
});

Deno.test({
	name: "Responses are serialized and deserialized when hooks are specified",
	async fn() {
		const messageHandlerA = new ExtendedMessageHandler();
		new StudioConnection(messageHandlerA, {
			reliableResponseHandlers: {
				/**
				 * @param {number} num
				 */
				foo: num => num,
			},
			responseSerializers: {
				/**
				 * @param {number} num
				 */
				foo: num => {
					const buffer = new ArrayBuffer(1);
					const view = new DataView(buffer);
					view.setUint8(0, num);
					return buffer;
				},
			},
		});

		const messageHandlerB = new ExtendedMessageHandler();
		const connectionB = new StudioConnection(messageHandlerB, {
			responseDeserializers: {
				foo: buffer => {
					const view = new DataView(buffer);
					return view.getUint8(0);
				},
			},
		});

		connectMessageHandlers(messageHandlerA, messageHandlerB);

		const result = await connectionB.messenger.send.foo(42);
		assertEquals(result, 42);
		const result2 = await connectionB.messenger.send.foo(513);
		assertEquals(result2, 1);
	},
});

Deno.test({
	name: "Throws when a request deserializer is missing",
	async fn() {
		const messageHandler = new ExtendedMessageHandler();
		new StudioConnection(messageHandler, {
			reliableResponseHandlers: {
				/**
				 * @param {number} num
				 */
				foo: num => num,
			},
			requestDeserializers: {},
		});

		await assertRejects(async () => {
			await messageHandler.handleMessageReceived({});
		}, Error, "This message handler is expected to only receive ArrayBuffer messages.");
	},
});

Deno.test({
	name: "Throws when a request deserializer is missing",
	async fn() {
		const messageHandlerA = new ExtendedMessageHandler();
		new StudioConnection(messageHandlerA, {
			reliableResponseHandlers: {
				/**
				 * @param {number} num
				 */
				foo: num => num,
			},
		});

		const messageHandlerB = new ExtendedMessageHandler();
		const connectionB = new StudioConnection(messageHandlerB, {
			requestSerializers: {
				/**
				 * @param {number} num
				 */
				foo: num => {
					const buffer = new ArrayBuffer(1);
					const view = new DataView(buffer);
					view.setUint8(0, num);
					return buffer;
				},
			},
		});

		connectMessageHandlers(messageHandlerA, messageHandlerB);

		await assertRejects(async () => {
			await connectionB.messenger.send.foo(42);
		}, Error, `Unexpected serialized request message was received for "foo". The message was serialized by the sender in the 'requestSerializers' object, but no deserializer was defined in the 'requestDeserializers' object.`);
	},
});

Deno.test({
	name: "Throws when a response deserializer is missing",
	async fn() {
		const messageHandlerA = new ExtendedMessageHandler();
		new StudioConnection(messageHandlerA, {
			reliableResponseHandlers: {
				/**
				 * @param {number} num
				 */
				foo: num => num,
			},
			responseSerializers: {
				/**
				 * @param {number} num
				 */
				foo: num => {
					const buffer = new ArrayBuffer(1);
					const view = new DataView(buffer);
					view.setUint8(0, num);
					return buffer;
				},
			},
		});

		const messageHandlerB = new ExtendedMessageHandler();
		const connectionB = new StudioConnection(messageHandlerB, {});

		connectMessageHandlers(messageHandlerA, messageHandlerB);

		await assertRejects(async () => {
			await connectionB.messenger.send.foo(42);
		}, Error, `Unexpected serialized response message was received for "foo". The message was serialized by the sender in the 'responseSerializers' object, but no deserializer was defined in the 'responseDeserializers' object.`);
	},
});
