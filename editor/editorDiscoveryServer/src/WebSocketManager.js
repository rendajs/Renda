import {WebSocketConnection} from "./WebSocketConnection.js";

export class WebSocketManager {
	constructor() {
		/** @type {Map<string, WebSocketConnection>} */
		this.activeConnections = new Map();

		/** @type {Map<string, Set<WebSocketConnection>>} */
		this.connectionsByRemoteAddress = new Map();
	}

	async init() {
		const listener = Deno.listen({port: 8082});
		for await (const conn of listener) {
			this.handleHttp(conn);
		}
	}

	/**
	 * @param {Deno.Conn} conn
	 */
	async handleHttp(conn) {
		const httpConn = Deno.serveHttp(conn);
		for await (const e of httpConn) {
			const {socket, response} = Deno.upgradeWebSocket(e.request);
			if (conn.remoteAddr.transport != "tcp" && conn.remoteAddr.transport != "udp") {
				conn.close();
				return;
			}
			const addr = /** @type {Deno.NetAddr} */ (conn.remoteAddr);
			const remoteAddress = addr.hostname;
			const connection = new WebSocketConnection(this, remoteAddress, socket);
			this.activeConnections.set(connection.id, connection);

			let connections = this.connectionsByRemoteAddress.get(remoteAddress);
			if (!connections) {
				connections = new Set();
				this.connectionsByRemoteAddress.set(remoteAddress, connections);
			}
			connections.add(connection);

			socket.addEventListener("close", () => {
				this.activeConnections.delete(connection.id);
				const connections = this.connectionsByRemoteAddress.get(remoteAddress);
				if (connections) {
					connections.delete(connection);
					if (connections.size <= 0) {
						this.connectionsByRemoteAddress.delete(remoteAddress);
					}
				}
			});
			e.respondWith(response);
		}
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
