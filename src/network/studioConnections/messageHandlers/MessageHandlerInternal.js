import {MessageHandler} from "./MessageHandler.js";

export class MessageHandlerInternal extends MessageHandler {
	/**
	 * @param {import("../../../util/mod.js").UuidString} connectionId
	 * @param {import("../discoveryManagers/DiscoveryManagerInternal.js").InternalDiscoveryRequestConnectionData} connectionData
	 * @param {MessagePort} messagePort
	 */
	constructor(connectionId, connectionData, messagePort) {
		super();
		this.connectionId = connectionId;
		this.connectionData = connectionData;
		this.autoSerializationSupported = true;
		/** @private */
		this.messagePort = messagePort;
		messagePort.addEventListener("message", e => {
			this.handleMessageReceived(e.data);
		});
		messagePort.start();
		this.setConnectionState("connected");
	}

	/**
	 * @override
	 * @param {unknown} data
	 */
	send(data) {
		if (!this.messagePort) return;
		this.messagePort.postMessage(data);
	}
}
