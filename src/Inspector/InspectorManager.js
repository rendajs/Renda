import {ENABLE_INSPECTOR_SUPPORT} from "../engineDefines.js";
import {InspectorConnection} from "./InspectorConnection.js";
import {InternalDiscoveryManager} from "./InternalDiscoveryManager.js";

export class InspectorManager {
	constructor() {
		if (!ENABLE_INSPECTOR_SUPPORT) return;

		/** @type {Map<import("../../editor/src/../../src/util/util.js").UuidString, InspectorConnection>} */
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
	 * @param {import("../../editor/src/../../src/util/util.js").UuidString} clientId
	 * @param {MessagePort} port
	 */
	handleConnectionCreated(clientId, port) {
		if (!ENABLE_INSPECTOR_SUPPORT) return;

		const inspectorConnection = new InspectorConnection(clientId, port);
		this.inspectorConnections.set(clientId, inspectorConnection);
	}
}
