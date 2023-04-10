import {BuiltInAssetManager} from "./BuiltInAssetManager.js";

import {WebSocketManager} from "./WebSocketManager.js";

/**
 * @typedef ApplicationOptions
 * @property {number?} [port] The port to listen on.
 * If null, the server will not listen, this way you can create your own server.
 * Use Application.webSocketManager.handleRequest to handle requests.
 * @property {string?} [builtInAssetsPath] The path to the buit-in assets folder.
 * If null, the path will default to ../../builtInAssets/ (relative to this file).
 */

export class Application {
	/**
	 * @param {ApplicationOptions} options
	 */
	constructor({
		port = null,
		builtInAssetsPath = null,
	} = {}) {
		this.port = port;

		this.webSocketManager = new WebSocketManager();
		this.builtInAssetManager = new BuiltInAssetManager({builtInAssetsPath, verbose: true});
		this.builtInAssetManager.loadAssetSettings();
		this.builtInAssetManager.watch();
	}

	init() {
		if (this.port != null) {
			this.webSocketManager.startServer(this.port);
		}

		this.webSocketManager.registerRoundTripOp("writeBuiltInAsset", async data => {
			console.log("======================= tried to write built in asset!!!")
			console.log(data);
			throw new Error("Tried to write built-in asset!");
			return await this.builtInAssetManager.writeAssetData(data.path, data.writeData);
		});

		this.builtInAssetManager.onWebsocketBroadcastNeeded((op, data) => {
			this.webSocketManager.sendAllConnections(op, data);
		});
	}

	destructor() {
		this.builtInAssetManager.stopWatching();
	}
}
