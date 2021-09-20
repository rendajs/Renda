export default class MessageHandlerInternal {
	/**
	 * @param {import("../../../Util/Util.js").UuidString} connectionId
	 * @param {import("../EditorConnectionsManager.js").default} connectionsManager
	 * @param {boolean} [isInitiator = false]
	 */
	constructor(connectionId, connectionsManager, isInitiator) {
		this.connectionId = connectionId;
		this.connectionsManager = connectionsManager;
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
			console.log(e.data);
		});
		messagePort.start();
	}
}
