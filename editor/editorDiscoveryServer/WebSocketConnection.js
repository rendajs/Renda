import generateUuid from "../common/generateUuid.js";

export default class WebSocketConnection {
	/**
	 * @param {import("websocket").connection} rawConnection
	 */
	constructor(rawConnection) {
		this.id = generateUuid();
		/** @type {import("websocket").connection} */
		this.rawConnection = rawConnection;

		this.rawConnection.on("message", this.onMessage.bind(this));
	}

	get remoteAddress() {
		return this.rawConnection.remoteAddress;
	}

	onMessage(message) {
		if (message.type != "utf8") return;

		let data = null;
		try {
			data = JSON.parse(message.utf8Data);
		} catch (e) {
			console.error("Failed to parse message: " + message.utf8Data);
		}

		console.log(data);
	}
}
