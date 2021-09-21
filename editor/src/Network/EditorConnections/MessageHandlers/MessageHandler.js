/**
 * @typedef {"offline" | "available" | "connecting" | "connected"} EditorConnectionState
 */

export default class MessageHandler {
	constructor() {
		this.onMessageCbs = new Set();
		this.onConnectionStateChangeCbs = new Set();
	}

	/**
	 * @abstract
	 * @param {*} data
	 */
	send(data) {}

	/**
	 * @param {*} data
	 */
	handleMessageReceived(data) {
		this.onMessageCbs.forEach(cb => cb(data));
	}

	/**
	 * @param {function(*) : void} cb
	 */
	onMessage(cb) {
		this.onMessageCbs.add(cb);
	}

	/**
	 * @param {EditorConnectionState} state
	 */
	setConnectionState(state) {
		this.onConnectionStateChangeCbs.forEach(cb => cb(state));
	}

	/**
	 * @param {function(EditorConnectionState) : void} cb
	 */
	onConnectionStateChange(cb) {
		this.onConnectionStateChangeCbs.add(cb);
	}
}
