export class InspectorConnection {
	/**
	 * @param {import("../../editor/src/../../src/util/util.js").UuidString} id
	 * @param {MessagePort} messagePort
	 */
	constructor(id, messagePort) {
		this.id = id;
		this.messagePort = messagePort;
	}
}
