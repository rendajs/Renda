import {server as WebSocketServer} from "websocket";
import http from "http";
import WebSocketConnection from "./WebSocketConnection.js";

export default class Main {
	constructor() {
		/** @type {Map<string, WebSocketConnection>} */
		this.activeConnections = new Map();

		/** @type {Map<string, WebSocketConnection>} */
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
			this.connectionsByRemoteAddress.set(connection.remoteAddress, connection);
		});
	}

	init() {
		const port = 8082;

		this.httpServer.listen(port, () => {});
		console.log("listening for websocket connections on port " + port);
	}
}
