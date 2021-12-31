import {BuiltInAssetManager} from "./BuiltInAssetManager.js";
import {ClosureCompilerManager} from "./ClosureCompilerManager.js";

import {WebSocketManager} from "./WebSocketManager.js";

export class Application {
	constructor() {
		this.webSocketManager = new WebSocketManager();
		this.builtInAssetManager = new BuiltInAssetManager();
		this.closureCompilerManager = new ClosureCompilerManager();
	}

	init() {
		this.webSocketManager.init();

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
