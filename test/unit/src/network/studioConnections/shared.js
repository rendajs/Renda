import { spy } from "std/testing/mock.ts";
import { MessageHandler } from "../../../../../src/network/studioConnections/messageHandlers/MessageHandler.js";
import { StudioConnection } from "../../../../../src/network/studioConnections/StudioConnection.js";

export class ExtendedMessageHandler extends MessageHandler {
	/** @type {Set<(data: any) => void | Promise<void>>} */
	#onSendCalledCbs = new Set();
	constructor({
		supportsSerialization = false,
	} = {}) {
		super({
			otherClientUuid: "otherClientUuid",
			availableConnectionData: {
				clientType: "inspector",
				projectMetadata: {
					fileSystemHasWritePermissions: true,
					name: "test project name",
					uuid: "test project uuid",
				},
				id: "otherClientUuid",
			},
			connectionType: "testConnectionType",
			initiatedByMe: false,
			connectionRequestData: {
				token: "connection token",
			},
		});

		this.supportsSerialization = supportsSerialization;
		this.setStatus("connecting");

		this.sendSpy = spy(this, "send");
		this.closeSpy = spy(this, "close");
	}

	/**
	 * @param {any} data
	 */
	async send(data) {
		for (const cb of this.#onSendCalledCbs) {
			await cb(data);
		}
	}

	/**
	 * @param {(data: any) => void | Promise<void>} cb
	 */
	onSendCalled(cb) {
		this.#onSendCalledCbs.add(cb);
	}

	/**
	 * @param {any} data
	 */
	handleMessageReceived(data) {
		return super.handleMessageReceived(data);
	}

	/**
	 * @param {import("../../../../../src/network/studioConnections/messageHandlers/MessageHandler.js").MessageHandlerStatus} status
	 */
	setStatus(status) {
		super.setStatus(status);
	}
}

/**
 * @param {ExtendedMessageHandler} messageHandlerA
 * @param {ExtendedMessageHandler} messageHandlerB
 */
export function connectMessageHandlers(messageHandlerA, messageHandlerB) {
	messageHandlerA.onSendCalled(async data => {
		await messageHandlerB.handleMessageReceived(data);
	});
	messageHandlerB.onSendCalled(async data => {
		await messageHandlerA.handleMessageReceived(data);
	});
	messageHandlerA.setStatus("connected");
	messageHandlerB.setStatus("connected");
}

/**
 * @template {import("../../../../../src/mod.js").TypedMessengerSignatures} TReliableRespondHandlers
 * @template {import("../../../../../src/mod.js").TypedMessengerSignatures} TReliableRequestHandlers
 * @param {import("../../../../../src/network/studioConnections/DiscoveryManager.js").ConnectionRequestAcceptOptions<TReliableRespondHandlers>} handlersA
 * @param {import("../../../../../src/network/studioConnections/DiscoveryManager.js").ConnectionRequestAcceptOptions<TReliableRequestHandlers>} handlersB
 */
export function createLinkedStudioConnections(handlersA, handlersB, { supportsSerialization = false } = {}) {
	const messageHandlerA = new ExtendedMessageHandler({ supportsSerialization });
	/** @type {StudioConnection<TReliableRespondHandlers, TReliableRequestHandlers>} */
	const connectionA = new StudioConnection(messageHandlerA, handlersA);

	const messageHandlerB = new ExtendedMessageHandler({ supportsSerialization });
	/** @type {StudioConnection<TReliableRequestHandlers, TReliableRespondHandlers>} */
	const connectionB = new StudioConnection(messageHandlerB, handlersB);

	connectMessageHandlers(messageHandlerA, messageHandlerB);

	return { connectionA, connectionB, messageHandlerA, messageHandlerB };
}
