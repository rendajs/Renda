import generateUuid from "../common/generateUuid.js";
import main from "./mainInstance.js";

export default class WebSocketConnection {
	/**
	 * @param {import("websocket").connection} rawConnection
	 */
	constructor(rawConnection) {
		this.id = generateUuid();
		this.clientType = "editor"; // todo: support for setting this from client
		this.projectMetaData = null;
		/** @type {import("websocket").connection} */
		this.rawConnection = rawConnection;

		this.firstIsHostMessageReceived = false;
		this.isEditorHost = false;
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

		if (op == "setIsEditorHost") {
			const newIsHost = !!data.isHost;
			if (newIsHost == this.isEditorHost && this.firstIsHostMessageReceived) return;
			this.isEditorHost = newIsHost;
			this.firstIsHostMessageReceived = true;
			if (this.isEditorHost) {
				this.notifyNearbyHostConnectionsAdd();
			} else {
				this.sendNearbyHostConnectionsList();
			}
		} else if (op == "projectMetaData") {
			const {projectMetaData} = data;
			this.projectMetaData = projectMetaData;
			this.notifyNearbyHostConnectionsUpdateProjectMetaData();
		} else if (op == "relayMessage") {
			const {toUuid, data: relayData} = data;
			if (!toUuid || !relayData) return;
			const toConnection = main.getConnection(toUuid);
			if (!toConnection) return;
			toConnection.sendRelayData(this.id, relayData);
		}
	}

	onClose() {
		if (this.isEditorHost) {
			this.notifyNearbyHostConnectionsRemove();
		}
	}

	/**
	 * @param {*} data
	 */
	send(data) {
		this.rawConnection.send(JSON.stringify(data));
	}

	getConnectionData() {
		return {
			id: this.id,
			clientType: this.clientType,
			projectMetaData: this.projectMetaData,
		};
	}

	sendNearbyHostConnectionsList() {
		const connectionsData = [];
		for (const connection of main.getConnectionsByRemoteAddress(this.remoteAddress)) {
			if (!connection.isEditorHost) continue;
			connectionsData.push(connection.getConnectionData());
		}
		this.send({
			op: "nearbyHostConnectionsList",
			connections: connectionsData,
		});
	}

	notifyNearbyHostConnectionsAdd() {
		for (const connection of main.getConnectionsByRemoteAddress(this.remoteAddress)) {
			if (connection.isEditorHost) continue;

			connection.sendNearbyHostConnectionAdded(this);
		}
	}

	notifyNearbyHostConnectionsRemove() {
		for (const connection of main.getConnectionsByRemoteAddress(this.remoteAddress)) {
			if (connection.isEditorHost) continue;

			connection.sendNearbyHostConnectionRemoved(this);
		}
	}

	notifyNearbyHostConnectionsUpdateProjectMetaData() {
		for (const connection of main.getConnectionsByRemoteAddress(this.remoteAddress)) {
			if (connection.isEditorHost) continue;

			connection.sendNearbyHostConnectionUpdateProjectMetaData(this);
		}
	}

	/**
	 * @param {WebSocketConnection} connection
	 */
	sendNearbyHostConnectionAdded(connection) {
		this.send({
			op: "nearbyHostConnectionAdded",
			connection: connection.getConnectionData(),
		});
	}

	/**
	 * @param {WebSocketConnection} connection
	 */
	sendNearbyHostConnectionRemoved(connection) {
		this.send({
			op: "nearbyHostConnectionRemoved",
			id: connection.id,
		});
	}

	/**
	 *
	 * @param {WebSocketConnection} connection
	 */
	sendNearbyHostConnectionUpdateProjectMetaData(connection) {
		this.send({
			op: "nearbyHostConnectionUpdateProjectMetaData",
			id: connection.id,
			projectMetaData: connection.projectMetaData,
		});
	}

	/**
	 * @param {string} fromUuid
	 * @param {*} data
	 */
	sendRelayData(fromUuid, data) {
		this.send({
			op: "relayMessage",
			fromUuid, data,
		});
	}
}
