export default class EditorConnection {
	/**
	 * @param {import("./MessageHandlers/MessageHandler.js").default} messageHandler
	 */
	constructor(messageHandler) {
		this.messageHandler = messageHandler;

		/** @type {import("./MessageHandlers/MessageHandler.js").EditorConnectionState} */
		this.connectionState = "offline";
		this.onConnectionStateChangeCbs = new Set();

		this.messageHandler.onConnectionStateChange(newState => {
			this.connectionState = newState;
			this.onConnectionStateChangeCbs.forEach(cb => cb(newState));
		});
		this.messageHandler.onMessage(data => {
			console.log(data);
		});
	}

	/**
	 * @param {function(import("./MessageHandlers/MessageHandler.js").EditorConnectionState) : void} cb
	 */
	onConnectionStateChange(cb) {
		this.onConnectionStateChangeCbs.add(cb);
	}
}
