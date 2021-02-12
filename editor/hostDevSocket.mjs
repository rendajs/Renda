#!/usr/bin/env node

import {server as WebSocketServer} from "websocket";
import http from "http";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

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

function sendAllConnections(data){
	const str = JSON.stringify(data);
	for(const connection of activeConnections){
		connection.sendUTF(str);
	}
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const builtInAssetsPath = path.resolve(__dirname, "builtInAssets/");
console.log("watching for file changes in " + builtInAssetsPath);
fs.watch(builtInAssetsPath, {recursive:true}, (eventType, filename) => {
	sendAllConnections({
		type: "builtInAssetChange",
		path: filename,
	});
});
