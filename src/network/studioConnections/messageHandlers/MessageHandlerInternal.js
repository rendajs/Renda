import {MessageHandler} from "./MessageHandler.js";

export class MessageHandlerInternal extends MessageHandler {
	/**
	 * @param {import("../../../util/mod.js").UuidString} connectionId
	 * @param {import("../discoveryManagers/DiscoveryManagerInternal.js").InternalDiscoveryRequestConnectionData} connectionData
	 */
	constructor(connectionId, connectionData) {
		super();
		this.connectionId = connectionId;
		this.connectionData = connectionData;
		this.autoSerializationSupported = true;
		this.messagePort = null;
	}

	/**
	 * @param {MessagePort} messagePort
	 */
	assignMessagePort(messagePort) {
		this.messagePort = messagePort;
		messagePort.addEventListener("message", e => {
			this.handleMessageReceived(e.data);
		});
		messagePort.start();
		this.setConnectionState("connected");
	}

	/**
	 * @override
	 * @param {*} data
	 */
	send(data) {
		if (!this.messagePort) return;
		this.messagePort.postMessage(data);
	}
}
