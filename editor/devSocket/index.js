#!/usr/bin/env node

import {server as WebSocketServer} from "websocket";
import http from "http";
import BuiltInAssetManager from "./BuiltInAssetManager.js";
import ClosureCompilerManager from "./ClosureCompilerManager.js";

const port = 5071;

const httpServer = http.createServer((request, response) => {});
httpServer.listen(port, function() {});
console.log("listening for websocket connections on port " + port);

const wsServer = new WebSocketServer({
	httpServer,
	autoAcceptConnections: true,
	fragmentationThreshold: 1_000_000_000, //1 GB
	maxReceivedFrameSize: 1_000_000_000, //1 GB
});
const activeConnections = new Set();
wsServer.on("connect", connection => {
	activeConnections.add(connection);
	connection.on("message", e => {
		if(e.type == "utf8"){
			const json = JSON.parse(e.utf8Data)
			if(json.op == "roundTripRequest"){
				const responseCb = responseData => {
					connection.send(JSON.stringify({
						op: "roundTripResponse",
						data: {
							roundTripId: json.roundTripId,
							responseData,
						},
					}));
				}
				if(json.roundTripOp == "runClosureCompiler"){
					global.closureCompilerManager.compileJs(responseCb, json.data);
				}
			}
		}
	});
});
wsServer.on("close", connection => {
	activeConnections.delete(connection);
});

export function sendAllConnections(op, data){
	const str = JSON.stringify({op, data});
	for(const connection of activeConnections){
		connection.sendUTF(str);
	}
}

global.builtInAssetManager = new BuiltInAssetManager();
global.closureCompilerManager = new ClosureCompilerManager();
