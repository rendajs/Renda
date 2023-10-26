import {ENABLE_INSPECTOR_SUPPORT} from "../studioDefines.js";
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

		/** @private */
		this.parentStudioHandler = new ParentStudioHandler();
		/** @private */
		this.connectionsManager = new StudioConnectionsManager("inspector", {});

		this.connectionsManager.onConnectionRequest(connection => {
			console.log(connection);
		});
		this.parentStudioHandler.requestParentStudioConnection(this.connectionsManager, [DiscoveryManagerInternal, DiscoveryManagerWebRtc]);
	}
}
