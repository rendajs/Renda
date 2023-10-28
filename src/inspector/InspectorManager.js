import {ENABLE_INSPECTOR_SUPPORT} from "../studioDefines.js";
import {InternalDiscoveryMethod} from "../network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js";
import {DiscoveryManager} from "../network/studioConnections/DiscoveryManager.js";
import {ParentStudioHandler} from "../network/studioConnections/ParentStudioHandler.js";
import {WebRtcDiscoveryMethod} from "../network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js";

export class InspectorManager {
	constructor() {
		if (!ENABLE_INSPECTOR_SUPPORT) return;

		/** @private */
		this.parentStudioHandler = new ParentStudioHandler();
		/** @private */
		this.connectionsManager = new DiscoveryManager("inspector");

		this.connectionsManager.onConnectionRequest(connection => {
			console.log(connection);
		});
		this.parentStudioHandler.requestParentStudioConnection(this.connectionsManager, [InternalDiscoveryMethod, WebRtcDiscoveryMethod]);
	}
}
