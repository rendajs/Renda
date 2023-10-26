import {MessageHandler} from "./MessageHandler.js";

export class MessageHandlerInternal extends MessageHandler {
	/**
	 * @param {import("./MessageHandler.js").MessageHandlerOptions} options
	 * @param {import("../discoveryManagers/DiscoveryManagerInternal.js").InternalDiscoveryRequestConnectionData} interlnalConnectionData
	 * @param {MessagePort} messagePort
	 */
	constructor(options, interlnalConnectionData, messagePort) {
		super(options);
		this.interlnalConnectionData = interlnalConnectionData;
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

	close() {
		this.messagePort.close();
	}
}
