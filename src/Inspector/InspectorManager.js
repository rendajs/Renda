import {InspectorConnection} from "./InspectorConnection.js";
import {InternalDiscoveryManager} from "./InternalDiscoveryManager.js";

export class InspectorManager {
	constructor() {
		this.inspectorConnections = new Map();

		this.internalDiscoveryManager = new InternalDiscoveryManager();
		this.internalDiscoveryManager.postMessage({"op": "registerClient", "clientType": "inspector"});
		this.internalDiscoveryManager.onMessage(data => {
			const op = data["op"];
			if (op == "connectionCreated") {
				this.handleConnectionCreated(data["clientId"], data["port"]);
			}
		});
	}

	/**
	 * @param {import("../../editor/src/../../src/util/mod.js").UuidString} clientId
	 * @param {MessagePort} port
	 */
	handleConnectionCreated(clientId, port) {
		const inspectorConnection = new InspectorConnection(clientId, port);
		this.inspectorConnections.set(clientId, inspectorConnection);
	}
}
