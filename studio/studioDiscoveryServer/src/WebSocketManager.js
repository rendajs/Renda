import {WebSocketConnection} from "./WebSocketConnection.js";

export class WebSocketManager {
	constructor() {
		/** @type {Map<string, WebSocketConnection>} */
		this.activeConnections = new Map();

		/** @type {Map<string, Set<WebSocketConnection>>} */
		this.connectionsByRemoteAddress = new Map();
	}

	/**
	 * @param {Request} request
	 * @param {import("std/http/server.ts").ConnInfo} connInfo
	 */
	handleRequest(request, connInfo) {
		const {socket, response} = Deno.upgradeWebSocket(request);
		if (connInfo.remoteAddr.transport != "tcp" && connInfo.remoteAddr.transport != "udp") {
			throw new Error("Invalid connection type");
		}
		const remoteAddress = connInfo.remoteAddr.hostname;
		const connection = new WebSocketConnection(this, remoteAddress, socket);
		this.activeConnections.set(connection.id, connection);

		let connections = this.connectionsByRemoteAddress.get(remoteAddress);
		if (!connections) {
			connections = new Set();
			this.connectionsByRemoteAddress.set(remoteAddress, connections);
		}
		connections.add(connection);

		socket.addEventListener("close", () => {
			connection.onClose();
			this.activeConnections.delete(connection.id);
			const connections = this.connectionsByRemoteAddress.get(remoteAddress);
			if (connections) {
				connections.delete(connection);
				if (connections.size <= 0) {
					this.connectionsByRemoteAddress.delete(remoteAddress);
				}
			}
		});
		return response;
	}

	/**
	 * @param {string} remoteAddress
	 */
	*getConnectionsByRemoteAddress(remoteAddress) {
		const connections = this.connectionsByRemoteAddress.get(remoteAddress);
		if (connections) {
			yield* connections;
		}
	}

	/**
	 * @param {string} uuid
	 */
	getConnection(uuid) {
		return this.activeConnections.get(uuid);
	}
}
