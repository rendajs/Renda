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

		let resolveInitialConnectionPromise = () => {};

		/**
		 * A promise which resolves when either an inspector connection has been made,
		 * or 2 seconds after creation of the InspectorManager.
		 * @private @type {Promise<void>}
		 */
		this._initialConnectionPromise = new Promise(resolve => {
			resolveInitialConnectionPromise = resolve;
			setTimeout(() => {
				resolve();
			}, 2000);
		});

		this.discoveryManager.onConnectionRequest(connectionRequest => {
			if (connectionRequest.clientType == "inspector") {
				throw new Error("An inspector is not able to connect to another inspector.");
			} else if (connectionRequest.clientType == "studio-client" || connectionRequest.clientType == "studio-host") {
				/** @type {import("../../studio/src/network/studioConnections/handlers.js").InspectorStudioConnection} */
				const connection = connectionRequest.accept(this.getResponseHandlers());
				this._inspectorConnections.set(connection.otherClientUuid, connection);
				if (connection.status == "connected") {
					resolveInitialConnectionPromise();
				} else {
					connection.onStatusChange(status => {
						if (status == "connected") {
							resolveInitialConnectionPromise();
						}
					});
				}
			} else {
				throw new Error(`Unexpected client type: "${connectionRequest.clientType}".`);
			}
		});
		this.parentStudioCommunicator.requestDesiredParentStudioConnection(this.discoveryManager, [InternalDiscoveryMethod, WebRtcDiscoveryMethod]);
	}

	/**
	 * Iterates over all current connections and sends a request as provided in the callback to each one.
	 * The first response will be returned.
	 * @template TCallbackReturn
	 * @template TDefaultReturn
	 * @param {object} options
	 * @param {(connection: import("../../studio/src/network/studioConnections/handlers.js").InspectorStudioConnection) => Promise<TCallbackReturn>} options.cb The callback to fire for each connection.
	 * This should make a request to the connection's messenger and return its value.
	 * Alternatively you can return `undefined` to ommit the result.
	 * @param {boolean} [options.waitForInitialConnection] If true (which is the default), no callback
	 * will be fired until there is at least one connection,
	 * or after a timeout is reached shortly after the creation of this `InspectorManager`.
	 * @param {TDefaultReturn} options.defaultReturnValue In case all of the callbacks return `undefined`,
	 * or if there are no active connections, this value will be returned instead.
	 */
	async raceAllConnections({cb, waitForInitialConnection = true, defaultReturnValue}) {
		if (!ENABLE_INSPECTOR_SUPPORT) return defaultReturnValue;

		if (waitForInitialConnection) {
			await this._initialConnectionPromise;
		}
		/** @type {Promise<TCallbackReturn>[]} */
		const promises = [];
		for (const connection of this._inspectorConnections.values()) {
			if (connection.status != "connected") continue;
			const promise = cb(connection);
			promises.push(promise);
		}

		/** @type {Promise<TCallbackReturn & ({} | null)>} */
		const anyTruePromise = new Promise(resolve => {
			for (const promise of promises) {
				promise.then(result => {
					if (result !== undefined) resolve(result);
				});
			}
		});
		const allPromise = (async () => {
			await Promise.allSettled(promises);
			return defaultReturnValue;
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
