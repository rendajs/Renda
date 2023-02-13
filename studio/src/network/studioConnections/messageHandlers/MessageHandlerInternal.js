import {MessageHandler} from "./MessageHandler.js";

export class MessageHandlerInternal extends MessageHandler {
	/**
	 * @param {import("../../../../../src/util/mod.js").UuidString} connectionId
	 * @param {import("../StudioConnectionsManager.js").StudioConnectionsManager} connectionsManager
	 * @param {boolean} isInitiator
	 */
	constructor(connectionId, connectionsManager, isInitiator = false) {
		super();
		this.connectionId = connectionId;
		this.connectionsManager = connectionsManager;
		this.autoSerializationSupported = true;
		this.messagePort = null;

		if (isInitiator) {
			this.connectionsManager.requestInternalMessageChannelConnection(this.connectionId);
		}
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
