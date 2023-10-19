import {ENABLE_INSPECTOR_SUPPORT} from "../studioDefines.js";
import {InspectorConnection} from "./InspectorConnection.js";
import {DiscoveryManagerInternal} from "../network/studioConnections/discoveryManagers/DiscoveryManagerInternal.js";
import {StudioConnectionsManager} from "../network/studioConnections/StudioConnectionsManager.js";
import {ParentStudioHandler} from "../network/studioConnections/ParentStudioHandler.js";
import {DiscoveryManagerWebRtc} from "../network/studioConnections/discoveryManagers/DiscoveryManagerWebRtc.js";

export class InspectorManager {
	/**
	 * @param {object} options
	 * @param {string} [options.fallbackDiscoveryUrl] If you wish to use the inspector on pages that are not hosted by a studio instance,
	 * you should provide a fallback url for the discovery iframe of the studio instance you wish to connect with.
	 * @param {string} [options.forceDiscoveryUrl] When set, no attempt is made to get the discovery url from the parent
	 * window, and the forced url is used immediately instead.
	 */
	constructor() {
		if (!ENABLE_INSPECTOR_SUPPORT) return;

		/** @type {Map<import("../../studio/src/../../src/util/util.js").UuidString, InspectorConnection>} */
		this.inspectorConnections = new Map();

		/** @private */
		this.parentStudioHandler = new ParentStudioHandler();
		/** @private */
		this.connectionsManager = new StudioConnectionsManager("inspector");

		this.connectionsManager.onConnectionCreated((otherClientId, port) => {
			const inspectorConnection = new InspectorConnection(otherClientId, port);
			this.inspectorConnections.set(otherClientId, inspectorConnection);
		});
		this.parentStudioHandler.requestParentStudioConnection(this.connectionsManager, [DiscoveryManagerInternal, DiscoveryManagerWebRtc]);
	}
}
