import {server as WebSocketServer} from "websocket";
import http from "http";
import WebSocketConnection from "./WebSocketConnection.js";

export default class Main {
	constructor() {
		/** @type {Map<string, WebSocketConnection>} */
		this.activeConnections = new Map();

		/** @type {Map<string, Set<WebSocketConnection>>} */
		this.connectionsByRemoteAddress = new Map();

		this.httpServer = http.createServer(() => {});

		this.wsServer = new WebSocketServer({
			httpServer: this.httpServer,
			autoAcceptConnections: true,
			fragmentationThreshold: 1_000_000_000, // 1 GB
			maxReceivedFrameSize: 1_000_000_000, // 1 GB
		});

		this.wsServer.on("connect", rawConnection => {
			const connection = new WebSocketConnection(rawConnection);
			this.activeConnections.set(connection.id, connection);
			const remoteAddress = connection.remoteAddress;

			let connections = this.connectionsByRemoteAddress.get(remoteAddress);
			if (!connections) {
				connections = new Set();
				this.connectionsByRemoteAddress.set(remoteAddress, connections);
			}
			connections.add(connection);

			rawConnection.on("close", () => {
				connection.onClose();
				this.activeConnections.delete(connection.id);
				const connections = this.connectionsByRemoteAddress.get(remoteAddress);
				connections.delete(connection);
				if (connections.size <= 0) {
					this.connectionsByRemoteAddress.delete(remoteAddress);
				}
			});
		});
	}

	init() {
		const port = 8082;

		this.httpServer.listen(port, () => {});
		console.log("listening for websocket connections on port " + port);
	}

	*getConnectionsByRemoteAddress(remoteAddress) {
		const connections = this.connectionsByRemoteAddress.get(remoteAddress);
		if (connections) {
			yield* connections;
		}
	}
}
