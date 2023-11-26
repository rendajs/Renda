import {ENABLE_INSPECTOR_SUPPORT} from "../studioDefines.js";
import {InternalDiscoveryMethod} from "../network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js";
import {DiscoveryManager} from "../network/studioConnections/DiscoveryManager.js";
import {ParentStudioCommunicator} from "../network/studioConnections/ParentStudioCommunicator.js";
import {WebRtcDiscoveryMethod} from "../network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js";

export class InspectorManager {
	constructor() {
		if (!ENABLE_INSPECTOR_SUPPORT) return;

		/** @private @type {Map<import("../../studio/src/../../src/util/util.js").UuidString, import("../../studio/src/network/studioConnections/handlers.js").InspectorStudioConnection>} */
		this._inspectorConnections = new Map();

		/** @private */
		this.parentStudioCommunicator = new ParentStudioCommunicator();
		/** @private */
		this.discoveryManager = new DiscoveryManager("inspector");

		this.discoveryManager.onConnectionRequest(connectionRequest => {
			if (connectionRequest.clientType == "inspector") {
				throw new Error("An inspector is not able to connect to another inspector.");
			} else if (connectionRequest.clientType == "studio-client" || connectionRequest.clientType == "studio-host") {
				/** @type {import("../../studio/src/network/studioConnections/handlers.js").InspectorStudioConnection} */
				const connection = connectionRequest.accept(this.getResponseHandlers());
				this._inspectorConnections.set(connection.otherClientUuid, connection);
			} else {
				throw new Error(`Unexpected client type: "${connectionRequest.clientType}"`);
			}
		});
		this.parentStudioCommunicator.requestDesiredParentStudioConnection(this.discoveryManager, [InternalDiscoveryMethod, WebRtcDiscoveryMethod]);
	}

	/**
	 * @param {import("../util/util.js").UuidString} uuid
	 */
	async requestHasAsset(uuid) {
		/** @type {Promise<boolean>[]} */
		const promises = [];
		for (const connection of this._inspectorConnections.values()) {
			const promise = connection.messenger.send["assets.hasAsset"](uuid);
			promises.push(promise);
		}

		/** @type {Promise<true>} */
		const anyTruePromise = new Promise(resolve => {
			for (const promise of promises) {
				promise.then(result => {
					if (result) resolve(true);
				});
			}
		});
		const allPromise = (async () => {
			await Promise.allSettled(promises);
			return false;
		})();

		return await Promise.race([anyTruePromise, allPromise]);
	}

	/**
	 * @private
	 */
	getResponseHandlers() {
		return {
		};
	}
}
