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

		this.webSocketManager.regisTerRoundTripOp("writeBuiltInAsset", async data => {
			return await this.builtInAssetManager.writeAssetData(data.path, data.writeData);
		});
		this.webSocketManager.regisTerRoundTripOp("runClosureCompiler", async data => {
			return await this.closureCompilerManager.compileJs(data);
		});
	}
}
