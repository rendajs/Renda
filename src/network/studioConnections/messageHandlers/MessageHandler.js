/** @typedef {"disconnected" | "connecting" | "connected"} StudioConnectionState */

/** @typedef {(state: StudioConnectionState) => void} OnConnectionStateChangeCallback */

export class MessageHandler {
	/** @typedef {(data: unknown) => void} OnMessageCallback */

	constructor() {
		/** @private @type {Set<OnMessageCallback>} */
		this.onMessageCbs = new Set();
		/** @type {StudioConnectionState} */
		this.connectionState = "disconnected";
		/** @private @type {Set<OnConnectionStateChangeCallback>} */
		this.onConnectionStateChangeCbs = new Set();
		this.autoSerializationSupported = false;
	}

	/**
	 * @abstract
	 * @param {unknown} data
	 */
	send(data) {}

	/**
	 * @protected
	 * @param {unknown} data
	 */
	handleMessageReceived(data) {
		this.onMessageCbs.forEach(cb => cb(data));
	}

	/**
	 * @param {OnMessageCallback} cb
	 */
	onMessage(cb) {
		this.onMessageCbs.add(cb);
	}

	/**
	 * @protected
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
