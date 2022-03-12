import {BuiltInAssetManager} from "./BuiltInAssetManager.js";
import {ClosureCompilerManager} from "./ClosureCompilerManager.js";

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
		this.closureCompilerManager = new ClosureCompilerManager();
	}

	init() {
		if (this.port != null) {
			this.webSocketManager.startServer(this.port);
		}

		this.webSocketManager.registerRoundTripOp("writeBuiltInAsset", async data => {
			return await this.builtInAssetManager.writeAssetData(data.path, data.writeData);
		});
		this.webSocketManager.registerRoundTripOp("runClosureCompiler", async data => {
			return await this.closureCompilerManager.compileJs(data);
		});

		this.builtInAssetManager.onWebsocketBroadcastNeeded((op, data) => {
			this.webSocketManager.sendAllConnections(op, data);
		});
	}
}
