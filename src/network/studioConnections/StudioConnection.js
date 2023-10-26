import {TypedMessenger} from "../../util/TypedMessenger.js";

/**
 * @template {import("../../mod.js").TypedMessengerSignatures} TReliableRespondHandlers
 * @template {import("../../mod.js").TypedMessengerSignatures} TReliableRequestHandlers
 */
export class StudioConnection {
	/**
	 * @param {import("./messageHandlers/MessageHandler.js").MessageHandler} messageHandler
	 * @param {TReliableRespondHandlers} reliableResponseHandlers
	 */
	constructor(messageHandler, reliableResponseHandlers) {
		/** @private */
		this.messageHandler = messageHandler;

		/** @type {TypedMessenger<TReliableRespondHandlers, TReliableRequestHandlers>} */
		this.messenger = new TypedMessenger();
		this.messenger.setResponseHandlers(reliableResponseHandlers);
		this.messenger.setSendHandler(data => {
			// TODO, support transfer
			messageHandler.send(data.sendData);
		});
		messageHandler.onMessage(data => {
			this.messenger.handleReceivedMessage(data);
		});
	}

	get clientType() {
		return this.messageHandler.clientType;
	}

	/**
	 * True when the connection was initiated by our client (i.e. the client that holds the instance of this class in memory).
	 */
	get initiatedByMe() {
		return this.messageHandler.initiatedByMe;
	}

	close() {
		this.messageHandler.close();
	}
}
