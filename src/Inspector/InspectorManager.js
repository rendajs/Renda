import {ENABLE_INSPECTOR_SUPPORT} from "../engineDefines.js";
import {InspectorConnection} from "./InspectorConnection.js";
import {InternalDiscoveryManager} from "./InternalDiscoveryManager.js";

export class InspectorManager {
	/**
	 * @param {object} options
	 * @param {string} [options.fallbackDiscoveryUrl] If you wish to use the inspector on pages that are not hosted by
	 * an editor, you should provide a fallback url for the discovery iframe of the editor you wish to connect with.
	 */
	constructor({
		fallbackDiscoveryUrl = "",
	} = {}) {
		if (!ENABLE_INSPECTOR_SUPPORT) return;

		/** @type {Map<import("../../editor/src/../../src/util/util.js").UuidString, InspectorConnection>} */
		this.inspectorConnections = new Map();

		this.internalDiscoveryManager = new InternalDiscoveryManager({fallbackDiscoveryUrl});
		this.internalDiscoveryManager.registerClient("inspector");
		this.internalDiscoveryManager.onConnectionCreated((otherClientId, port) => {
			const inspectorConnection = new InspectorConnection(otherClientId, port);
			this.inspectorConnections.set(otherClientId, inspectorConnection);
		});
	}
}
