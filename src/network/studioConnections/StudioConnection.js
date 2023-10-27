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
			messageHandler.send(data.sendData, {transfer: data.transfer});
		});
		messageHandler.onMessage(data => {
			const castData = /** @type {import("../../mod.js").TypedMessengerMessageSendData<TReliableRespondHandlers, TReliableRequestHandlers>} */ (data);
			this.messenger.handleReceivedMessage(castData);
		});
	}

	get clientType() {
		return this.messageHandler.clientType;
	}

	get connectionType() {
		return this.messageHandler.connectionType;
	}

	/**
	 * True when the connection was initiated by our client (i.e. the client that holds the instance of this class in memory).
	 */
	get initiatedByMe() {
		return this.messageHandler.initiatedByMe;
	}

	get projectMetaData() {
		return this.messageHandler.projectMetaData;
	}

	close() {
		this.messageHandler.close();
	}
}
