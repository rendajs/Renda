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
	 * @param {object} [sendOptions]
	 * @param {Transferable[]} [sendOptions.transfer]
	 */
	send(data, {transfer} = {}) {
		if (!this.messagePort) return;
		this.messagePort.postMessage(data, transfer || []);
	}

	close() {
		this.messagePort.close();
	}
}
