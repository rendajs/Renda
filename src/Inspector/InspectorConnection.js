export class InspectorConnection {
	/**
	 * @param {import("../../editor/src/Util/Util.js").UuidString} id
	 * @param {MessagePort} messagePort
	 */
	constructor(id, messagePort) {
		this.id = id;
		this.messagePort = messagePort;
	}
}
