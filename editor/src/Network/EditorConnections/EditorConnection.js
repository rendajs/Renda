export default class EditorConnection {
	/**
	 * @param {import("./MessageHandlers/MessageHandler.js").default} messageHandler
	 */
	constructor(messageHandler) {
		this.messageHandler = messageHandler;
	}
}
