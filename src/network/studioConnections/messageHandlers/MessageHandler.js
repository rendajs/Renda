/** @typedef {"disconnected" | "connecting" | "connected"} StudioConnectionState */

/** @typedef {(state: StudioConnectionState) => void} OnConnectionStateChangeCallback */

/**
 * @typedef MessageHandlerOptions
 * @property {import("../../../mod.js").UuidString} otherClientUuid
 * @property {boolean} initiatedByMe True when the connection was initiated by our client (i.e. the client which you are currently instantiating a class for).
 * @property {string} connectionType The type of the DiscoveryManager that created this connection.
 * @property {import("../DiscoveryManager.js").AvailableStudioData} connectionData
 */

export class MessageHandler {
	/** @typedef {(data: unknown) => void} OnMessageCallback */

	/**
	 * @param {MessageHandlerOptions} options
	 */
	constructor(options) {
		/** @private */
		this._otherClientUuid = options.otherClientUuid;
		/** @private */
		this._initiatedByMe = options.initiatedByMe;
		/** @private */
		this._connectionType = options.connectionType;
		/** @private */
		this._connectionData = options.connectionData;

		/** @private @type {Set<OnMessageCallback>} */
		this.onMessageCbs = new Set();
		/** @type {StudioConnectionState} */
		this.connectionState = "disconnected";

		/** @private @type {Set<OnConnectionStateChangeCallback>} */
		this.onConnectionStateChangeCbs = new Set();
		this.autoSerializationSupported = false;
	}

	get otherClientUuid() {
		return this._otherClientUuid;
	}

	/**
	 * True when the connection was initiated by our client (i.e. the client that holds the instance of this class in memory).
	 */
	get initiatedByMe() {
		return this._initiatedByMe;
	}

	/**
	 * The type of the DiscoveryManager that created this connection.
	 */
	get connectionType() {
		return this._connectionType;
	}

	get clientType() {
		return this._connectionData.clientType;
	}

	get projectMetadata() {
		return this._connectionData.projectMetadata;
	}

	/**
	 * @abstract
	 * @param {unknown} data
	 * @param {object} [sendOptions]
	 * @param {Transferable[]} [sendOptions.transfer]
	 */
	send(data, sendOptions) {}

	close() {}

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
