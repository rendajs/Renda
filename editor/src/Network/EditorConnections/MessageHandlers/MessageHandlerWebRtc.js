export default class MessageHandlerWebRtc {
	/**
	 * @param {string} otherClientUuid
	 * @param {import("../EditorConnectionsManager.js").default} connectionsManager
	 */
	constructor(otherClientUuid, connectionsManager) {
		this.otherClientUuid = otherClientUuid;
		this.connectionsManager = connectionsManager;
	}
}
