import {ENABLE_INSPECTOR_SUPPORT} from "../studioDefines.js";
import {InternalDiscoveryMethod} from "../network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js";
import {DiscoveryManager} from "../network/studioConnections/DiscoveryManager.js";
import {ParentStudioCommunicator} from "../network/studioConnections/ParentStudioCommunicator.js";
import {WebRtcDiscoveryMethod} from "../network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js";

export class InspectorManager {
	constructor() {
		if (!ENABLE_INSPECTOR_SUPPORT) return;

		/** @private @type {Map<import("../../studio/src/../../src/util/util.js").UuidString, InspectorConnection>} */
		this._inspectorConnections = new Map();

		this.internalDiscoveryManager = new InternalDiscoveryManager({fallbackDiscoveryUrl, forceDiscoveryUrl});
		this.internalDiscoveryManager.onConnectionCreated((otherClientId, port) => {
			const inspectorConnection = new InspectorConnection(otherClientId, port);
			this._inspectorConnections.set(otherClientId, inspectorConnection);
		/** @private */
		this.parentStudioCommunicator = new ParentStudioCommunicator();
		/** @private */
		this.discoveryManager = new DiscoveryManager("inspector");

		this.discoveryManager.onConnectionRequest(connection => {
			console.log(connection);
		});
		this.parentStudioCommunicator.requestDesiredParentStudioConnection(this.discoveryManager, [InternalDiscoveryMethod, WebRtcDiscoveryMethod]);
	}

	/**
	 * @param {import("../util/util.js").UuidString} uuid
	 */
	async requestHasAsset(uuid) {
		for (const _ of this._inspectorConnections.values()) {
			// TODO: pass request to connection
		}
		return false;
	}
}
