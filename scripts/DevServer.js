/**
 * @fileoverview
 * This file contains functionality for running the dev server. This is used
 * by both the `dev.js` script for local development, as well as for when
 * tests.
 */

import {serveDir} from "https://deno.land/std@0.127.0/http/file_server.ts";
import {Server} from "https://deno.land/std@0.127.0/http/server.ts";
import {Application as DevSocket} from "../editor/devSocket/src/Application.js";
import {resolve} from "std/path/mod.ts";

export class DevServer {
	#port;
	#serverName;
	#devSocket;
	#httpServer;

	/**
	 * @param {Object} options
	 * @param {number} options.port
	 * @param {string} options.serverName
	 */
	constructor({
		port,
		serverName,
	}) {
		this.#port = port;
		this.#serverName = serverName;
		const builtInAssetsPath = resolve(Deno.cwd(), "./editor/builtInAssets/");
		this.#devSocket = new DevSocket({
			builtInAssetsPath,
		});

		const fsRoot = Deno.cwd();
		this.#httpServer = new Server({
			port,
			handler: request => {
				const url = new URL(request.url);
				if (url.pathname == "/devSocket") {
					return this.#devSocket.webSocketManager.handleRequest(request);
				}
				return serveDir(request, {
					fsRoot,
					showDirListing: true,
					showDotfiles: true,
					quiet: true,
				});
			},
		});
	}

	start() {
		this.#devSocket.init();
		this.#httpServer.listenAndServe();
		console.log(`Started ${this.#serverName} on http://localhost:${this.#port}`);
	}

	close() {
		this.#devSocket.destructor();
		this.#httpServer.close();
		console.log(`Closed ${this.#serverName}.`);
	}
}
