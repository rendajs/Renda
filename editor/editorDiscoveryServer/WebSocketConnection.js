import generateUuid from "../common/generateUuid.js";
import main from "./mainInstance.js";

export default class WebSocketConnection {
	/**
	 * @param {import("websocket").connection} rawConnection
	 */
	constructor(rawConnection) {
		this.id = generateUuid();
		/** @type {import("websocket").connection} */
		this.rawConnection = rawConnection;

		this.firstIsHostMessageReceived = false;
		this.isHost = false;
		this.isDiscovering = false;

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

		if (!data) return;
		const {op} = data;
		if (!op) return;

		if (op == "setIsHost") {
			const newIsHost = !!data.isHost;
			if (newIsHost == this.isHost && this.firstIsHostMessageReceived) return;
			this.isHost = newIsHost;
			this.firstIsHostMessageReceived = true;
			if (this.isHost) {
				this.notifyNearbyClientEditorsAdded();
			} else {
				this.sendNearbyHostEditorsList();
			}
		}
	}

	onClose() {
		if (this.isHost) {
			this.notifyNearbyClientEditorsRemoved();
		}
	}

	send(data) {
		this.rawConnection.send(JSON.stringify(data));
	}

	getEditorData() {
		return {
			id: this.id,
		};
	}

	sendNearbyHostEditorsList() {
		const connectionsData = [];
		for (const connection of main.getConnectionsByRemoteAddress(this.remoteAddress)) {
			if (!connection.isHost) continue;
			connectionsData.push(connection.getEditorData());
		}
		this.send({
			op: "nearbyEditorsList",
			editors: connectionsData,
		});
	}

	notifyNearbyClientEditorsAdded() {
		for (const connection of main.getConnectionsByRemoteAddress(this.remoteAddress)) {
			if (connection.isHost) continue;

			connection.sendNearbyEditorAdded(this);
		}
	}

	notifyNearbyClientEditorsRemoved() {
		for (const connection of main.getConnectionsByRemoteAddress(this.remoteAddress)) {
			if (connection.isHost) continue;

			connection.sendNearbyEditorRemoved(this);
		}
	}

	/**
	 * @param {WebSocketConnection} connection
	 */
	sendNearbyEditorAdded(connection) {
		this.send({
			op: "nearbyEditorAdded",
			editor: connection.getEditorData(),
		});
	}

	/**
	 * @param {WebSocketConnection} connection
	 */
	sendNearbyEditorRemoved(connection) {
		this.send({
			op: "nearbyEditorRemoved",
			id: connection.id,
		});
	}
}
