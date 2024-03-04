/**
 * @fileoverview
 * This file contains functionality for running the dev server. This is used
 * by both the `dev.js` script for local development, as well as for when
 * tests.
 */

import { serveDir } from "std/http/file_server.ts";
import { Server } from "std/http/server.ts";
import { Application as DevSocket } from "../studio/devSocket/src/Application.js";
import { Application as StudioDiscovery } from "https://raw.githubusercontent.com/rendajs/studio-discovery-server/f11212158ce959f55713888eb7fb03679c186ef5/src/main.js";
import * as path from "std/path/mod.ts";
import * as fs from "std/fs/mod.ts";

export class DevServer {
	#port;
	#serverName;
	#devSocket;
	/** @type {Promise<StudioDiscovery>} */
	#studioDiscoveryPromise;
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
		const builtInAssetsPath = path.resolve(Deno.cwd(), "./studio/builtInAssets/");
		this.#devSocket = new DevSocket({
			builtInAssetsPath,
		});

		const fsRoot = Deno.cwd();
		this.#httpServer = new Server({
			port,
			handler: async (request, connInfo) => {
				const url = new URL(request.url);
				if (url.pathname == "/devSocket") {
					return this.#devSocket.webSocketManager.handleRequest(request);
				}
				if (url.pathname == "/studioDiscovery") {
					const studioDiscovery = await this.#studioDiscoveryPromise;
					return studioDiscovery.webSocketManager.handleRequest(request, connInfo);
				}
				if (url.pathname.endsWith("/internalDiscovery")) {
					request = new Request(request.url + ".html", request);
				}
				const response = await serveDir(request, {
					fsRoot,
					showDirListing: true,
					showDotfiles: true,
					quiet: true,
				});
				response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
				return response;
			},
		});

		this.#studioDiscoveryPromise = this.loadStudioDiscovery();
	}

	start() {
		this.#devSocket.init();
		this.#httpServer.listenAndServe();
		const addrs = this.getAddrs().map(addr => ` - ${addr}`);
		console.log(`Started ${this.#serverName} on:
${addrs.join("\n")}`);
	}

	async loadStudioDiscovery() {
		// We check if the studio-discovery-server repository is installed on the current system,
		// and if so we use that instead. This allows you to run the discovery server locally for development.
		// The studio-discovery-server repository does not have any capabilities for hosting included,
		// so if you want to work on it you need to run the dev script from this repository using `deno task dev`.
		const discoveryRepositoryEntryPoint = path.resolve(path.dirname(path.fromFileUrl(import.meta.url)), "../../studio-discovery-server/src/main.js");
		// TODO: use `isFile` when https://github.com/denoland/deno_std/pull/2785 lands.
		let StudioDiscoveryConstructor = StudioDiscovery;
		if (fs.existsSync(discoveryRepositoryEntryPoint)) {
			const { Application } = await import(discoveryRepositoryEntryPoint);
			StudioDiscoveryConstructor = Application;
		}
		return new StudioDiscoveryConstructor();
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
