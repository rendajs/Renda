import {WebSocketManager} from "./WebSocketManager.js";

export class Application {
	constructor() {
		this.webSocketManager = new WebSocketManager();

		// this.wsServer.on("connect", rawConnection => {
		// 	const connection = new WebSocketConnection(rawConnection);
		// 	this.activeConnections.set(connection.id, connection);
		// 	const remoteAddress = connection.remoteAddress;

		// 	let connections = this.connectionsByRemoteAddress.get(remoteAddress);
		// 	if (!connections) {
		// 		connections = new Set();
		// 		this.connectionsByRemoteAddress.set(remoteAddress, connections);
		// 	}
		// 	connections.add(connection);

		// 	rawConnection.on("close", () => {
		// 		connection.onClose();
		// 		this.activeConnections.delete(connection.id);
		// 		const connections = this.connectionsByRemoteAddress.get(remoteAddress);
		// 		connections.delete(connection);
		// 		if (connections.size <= 0) {
		// 			this.connectionsByRemoteAddress.delete(remoteAddress);
		// 		}
		// 	});
		// });
	}

	init() {
		this.webSocketManager.init();
	}
}
