import {TypedMessenger} from "../../util/TypedMessenger.js";

/**
 * @template {import("../../mod.js").TypedMessengerSignatures} TReliableRespondHandlers
 * @template {import("../../mod.js").TypedMessengerSignatures} TReliableRequestHandlers
 */
export class StudioConnection {
	/**
	 * @param {import("./messageHandlers/MessageHandler.js").MessageHandler} messageHandler
	 * @param {TReliableRespondHandlers} reliableRespondHandlers
	 */
	constructor(messageHandler, reliableRespondHandlers) {
		/** @private */
		this.messageHandler = messageHandler;

		/** @type {TypedMessenger<TReliableRespondHandlers, TReliableRequestHandlers>} */
		this.messenger = new TypedMessenger();
		this.messenger.setResponseHandlers(reliableRespondHandlers);
		this.messenger.setSendHandler(data => {
			// TODO, support transfer
			messageHandler.send(data.sendData);
		});
		messageHandler.onMessage(data => {
			this.messenger.handleReceivedMessage(data);
		});
	}
}
