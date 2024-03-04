import { serve } from "https://deno.land/std@0.127.0/http/server.ts";

export class WebSocketManager {
	constructor() {
		/** @type {Set<WebSocket>} */
		this.activeConnections = new Set();

		/** @type {Map<string, (data: any) => Promise<any> | any>} */
		this.registeredRoundTripOps = new Map();
	}

	/**
	 * @param {number} port
	 */
	async startServer(port) {
		serve((request) => {
			return this.handleRequest(request);
		}, { port });
		console.log(`DevSocket listening on port ${port}`);
	}

	/**
	 * @param {Request} request
	 */
	handleRequest(request) {
		const { socket, response } = Deno.upgradeWebSocket(request);
		this.activeConnections.add(socket);
		socket.addEventListener("message", (e) => {
			this.handleWebSocketMessage(e);
		});
		socket.addEventListener("close", () => {
			this.activeConnections.delete(socket);
		});
		return response;
	}

	/**
	 * @param {string} op
	 * @param {any} data
	 */
	sendAllConnections(op, data) {
		const str = JSON.stringify({ op, data });
		for (const connection of this.activeConnections) {
			connection.send(str);
		}
	}

	/**
	 * @param {MessageEvent<string>} e
	 */
	async handleWebSocketMessage(e) {
		const json = JSON.parse(e.data);
		if (json.op == "roundTripRequest") {
			if (!e.target) return;
			const socket = /** @type {WebSocket} */ (e.target);
			const roundTripOp = this.registeredRoundTripOps.get(json.roundTripOp);
			if (!roundTripOp) {
				socket.send(JSON.stringify({
					op: "roundTripOpNotFound",
					data: {
						roundTripId: json.roundTripId,
					},
				}));
				return;
			}
			const responseData = await roundTripOp(json.data);
			socket.send(JSON.stringify({
				op: "roundTripResponse",
				data: {
					roundTripId: json.roundTripId,
					responseData,
				},
			}));
		}
	}

	/**
	 * @param {string} op
	 * @param {(data: any) => any} cb
	 */
	registerRoundTripOp(op, cb) {
		this.registeredRoundTripOps.set(op, cb);
	}
}
