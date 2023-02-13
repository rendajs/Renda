/**
 * @fileoverview
 * This file contains functionality for running the dev server. This is used
 * by both the `dev.js` script for local development, as well as for when
 * tests.
 */

import {serveDir} from "std/http/file_server.ts";
import {Server} from "std/http/server.ts";
import {Application as DevSocket} from "../studio/devSocket/src/Application.js";
import {Application as StudioDiscovery} from "../studio/studioDiscoveryServer/src/Application.js";
import {resolve} from "std/path/mod.ts";

export class DevServer {
	#port;
	#serverName;
	#devSocket;
	#studioDiscovery;
	#httpServer;

	/**
	 * @param {object} options
	 * @param {number} options.port
	 * @param {string} options.serverName
	 */
	constructor({
		port,
		serverName,
	}) {
		this.#port = port;
		this.#serverName = serverName;
		const builtInAssetsPath = resolve(Deno.cwd(), "./studio/builtInAssets/");
		this.#devSocket = new DevSocket({
			builtInAssetsPath,
		});
		this.#studioDiscovery = new StudioDiscovery();

		const fsRoot = Deno.cwd();
		this.#httpServer = new Server({
			port,
			handler: (request, connInfo) => {
				const url = new URL(request.url);
				if (url.pathname == "/devSocket") {
					return this.#devSocket.webSocketManager.handleRequest(request);
				}
				if (url.pathname == "/studioDiscovery") {
					return this.#studioDiscovery.webSocketManager.handleRequest(request, connInfo);
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
		const addrs = this.getAddrs().map(addr => ` - ${addr}`);
		console.log(`Started ${this.#serverName} on:
${addrs.join("\n")}`);
	}

	getAddrs() {
		const ports = [];
		for (const addr of this.#httpServer.addrs) {
			if (addr.transport == "tcp" || addr.transport == "udp") {
				let hostname = addr.hostname;
				if (["0.0.0.0", "127.0.0.1"].includes(hostname)) {
					// Technically it's possible to have a system that doesn't  map localhost to
					// these ips, but some browser features require either a secure context or
					// localhost to be used. And in most cases this should be fine.
					// The e2e test runner also suffers from this issue, IndexedDB doesn't seem
					// to work on 0.0.0.0. This can be worked around using the
					// --unsafely-treat-insecure-origin-as-secure Chromium flag, but this doesn't
					// seem to have an effect when running in headless mode.
					// Either way, localhost also just looks better.
					hostname = "localhost";
				}
				ports.push(`http://${hostname}:${addr.port}`);
			}
		}
		return ports;
	}

	close() {
		this.#devSocket.destructor();
		this.#httpServer.close();
		console.log(`Closed ${this.#serverName}.`);
	}
}
