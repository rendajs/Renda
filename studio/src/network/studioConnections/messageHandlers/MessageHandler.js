/** @typedef {"disconnected" | "connecting" | "connected"} StudioConnectionState */

/** @typedef {(state: StudioConnectionState) => void} OnConnectionStateChangeCallback */

export class MessageHandler {
	constructor() {
		/** @type {Set<(data: any) => void>} */
		this.onMessageCbs = new Set();
		/** @type {StudioConnectionState} */
		this.connectionState = "disconnected";
		/** @type {Set<OnConnectionStateChangeCallback>} */
		this.onConnectionStateChangeCbs = new Set();
		this.autoSerializationSupported = false;
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
	 * @param {StudioConnectionState} state
	 */
	setConnectionState(state) {
		if (state == this.connectionState) return;
		this.connectionState = state;
		this.onConnectionStateChangeCbs.forEach(cb => cb(state));
	}

	/**
	 * @param {OnConnectionStateChangeCallback} cb
	 */
	onConnectionStateChange(cb) {
		this.onConnectionStateChangeCbs.add(cb);
	}
}
