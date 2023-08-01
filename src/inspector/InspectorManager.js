import {ENABLE_INSPECTOR_SUPPORT} from "../studioDefines.js";
import {InspectorConnection} from "./InspectorConnection.js";
import {InternalDiscoveryManager} from "./InternalDiscoveryManager.js";

export class InspectorManager {
	/**
	 * @param {object} options
	 * @param {string} [options.fallbackDiscoveryUrl] If you wish to use the inspector on pages that are not hosted by a studio instance,
	 * you should provide a fallback url for the discovery iframe of the studio instance you wish to connect with.
	 * @param {string} [options.forceDiscoveryUrl] When set, no attempt is made to get the discovery url from the parent
	 * window, and the forced url is used immediately instead.
	 */
	constructor({
		fallbackDiscoveryUrl = "",
		forceDiscoveryUrl = "",
	} = {}) {
		if (!ENABLE_INSPECTOR_SUPPORT) return;

		/** @type {Map<import("../../studio/src/../../src/util/util.js").UuidString, InspectorConnection>} */
		this.inspectorConnections = new Map();

		this.internalDiscoveryManager = new InternalDiscoveryManager({fallbackDiscoveryUrl, forceDiscoveryUrl});
		this.internalDiscoveryManager.onConnectionCreated((otherClientId, port) => {
			const inspectorConnection = new InspectorConnection(otherClientId, port);
			this.inspectorConnections.set(otherClientId, inspectorConnection);
		});
		this.internalDiscoveryManager.registerClient("inspector");
		this.internalDiscoveryManager.requestParentStudioConnection();
	}
}
