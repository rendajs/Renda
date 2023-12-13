/** @typedef {"disconnected" | "connecting" | "connected" | "outgoing-permission-pending" | "incoming-permission-pending" | "outgoing-permission-rejected"} MessageHandlerStatus */

/** @typedef {(state: MessageHandlerStatus) => void} OnStatusChangeCallback */

/**
 * @typedef MessageHandlerOptions
 * @property {import("../../../mod.js").UuidString} otherClientUuid
 * @property {boolean} initiatedByMe True when the connection was initiated by our client (i.e. the client which you are currently instantiating a class for).
 * @property {string} connectionType The type of the DiscoveryManager that created this connection.
 * @property {import("../DiscoveryManager.js").AvailableConnection} connectionData
 * @property {import("../DiscoveryManager.js").ConnectionRequestData} connectionRequestData
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
		this._connectionRequestData = options.connectionRequestData;
		/** @private */
		this._connectionType = options.connectionType;
		/** @private */
		this._connectionData = options.connectionData;

		/** @private @type {Set<OnMessageCallback>} */
		this.onMessageCbs = new Set();
		/** @type {MessageHandlerStatus} */
		this.status = "disconnected";

		/** @private @type {Set<OnStatusChangeCallback>} */
		this.onStatusChangeCbs = new Set();
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
	 * Data that was sent by the other end when the connection was requested.
	 */
	get connectionRequestData() {
		return this._connectionRequestData;
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

	/**
	 * Fired by the DiscoveryManager when the connection request was accepted.
	 * An implementation will pass this information on to the other MessageHandler that this is connected to.
	 * It will call `setStatus` on the other MessageHandler and setting its status to `connected`
	 * (or possibly `connecting` first).
	 * @abstract
	 */
	requestAccepted() {}

	/**
	 * Fired by the DiscoveryManager when the connection request was accepted.
	 * An implementation will pass this information on to the other MessageHandler that this is connected to.
	 * It will call `setStatus` on the other MessageHandler and setting its status to `outgoing-permission-rejected`.
	 * @abstract
	 */
	requestRejected() {}

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
	 * @param {MessageHandlerStatus} status
	 */
	setStatus(status) {
		if (status == this.status) return;
		this.status = status;
		this.onStatusChangeCbs.forEach(cb => cb(status));
	}

	/**
	 * @param {OnStatusChangeCallback} cb
	 */
	onStatusChange(cb) {
		this.onStatusChangeCbs.add(cb);
	}
}
