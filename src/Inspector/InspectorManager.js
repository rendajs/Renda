import {ENABLE_INSPECTOR_SUPPORT} from "../engineDefines.js";
import {InspectorConnection} from "./InspectorConnection.js";
import {InternalDiscoveryManager} from "./InternalDiscoveryManager.js";

export class InspectorManager {
	constructor() {
		if (!ENABLE_INSPECTOR_SUPPORT) return;

		/** @type {Map<import("../../editor/src/../../src/util/util.js").UuidString, InspectorConnection>} */
		this.inspectorConnections = new Map();

		this.internalDiscoveryManager = new InternalDiscoveryManager();
		this.internalDiscoveryManager.registerClient("inspector");
		this.internalDiscoveryManager.onConnectionCreated((otherClientId, port) => {
			const inspectorConnection = new InspectorConnection(otherClientId, port);
			this.inspectorConnections.set(otherClientId, inspectorConnection);
		});
	}
}
