export class WebSocketManager {
	constructor() {
		/** @type {Set<WebSocket>} */
		this.activeConnections = new Set();

		/** @type {Map<string, (data: any) => Promise<any> | any>} */
		this.registeredRoundTripOps = new Map();
	}

	async init() {
		const listener = Deno.listen({port: 8081});
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
			this.activeConnections.add(socket);
			socket.addEventListener("message", e => {
				this.handleWebSocketMessage(e);
			});
			socket.addEventListener("close", () => {
				this.activeConnections.delete(socket);
			});
			e.respondWith(response);
		}
	}

	/**
	 * @param {string} op
	 * @param {any} data
	 */
	sendAllConnections(op, data) {
		const str = JSON.stringify({op, data});
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

			// if (json.roundTripOp == "runClosureCompiler") {
			// 	globalThis.closureCompilerManager.compileJs(responseCb, json.data);
			// } else if (json.roundTripOp == "writeBuiltInAsset") {
			// 	globalThis.builtInAssetManager.writeAssetData(json.data.path, json.data.writeData, responseCb);
			// }
		}
	}

	/**
	 * @param {string} op
	 * @param {(data: any) => any} cb
	 */
	regisTerRoundTripOp(op, cb) {
		this.registeredRoundTripOps.set(op, cb);
	}
}
