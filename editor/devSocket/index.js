#!/usr/bin/env node

import {server as WebSocketServer} from "websocket";
import http from "http";
import BuiltInAssetManager from "./BuiltInAssetManager.js";

const port = 5071;

const httpServer = http.createServer((request, response) => {});
httpServer.listen(port, function() {});
console.log("listening for websocket connections on port " + port);

const wsServer = new WebSocketServer({
	httpServer,
	autoAcceptConnections: true,
});
const activeConnections = new Set();
wsServer.on("connect", connection => {
	activeConnections.add(connection);
});
wsServer.on("close", connection => {
	activeConnections.delete(connection);
});

export function sendAllConnections(data){
	const str = JSON.stringify(data);
	for(const connection of activeConnections){
		connection.sendUTF(str);
	}
}

global.builtInAssetManager = new BuiltInAssetManager();
