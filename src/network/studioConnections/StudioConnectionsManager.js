/** @typedef {"studio-host" | "inspector" | "studio-client"} ClientType */

export class StudioConnectionsManager {
	/**
	 * @param {ClientType} clientType
	 */
	constructor(clientType) {
		/** @private */
		this.clientType = clientType;

		/** @private @type {Set<import("./discoveryManagers/DiscoveryManager.js").DiscoveryManager<any>>} */
		this.discoveryManagers = new Set();
	}

	/**
	 * @template {import("./messageHandlers/MessageHandler.js").MessageHandler} THandler
	 * @template {any[]} TArgs
	 * @param {new (...args: TArgs) => import("./discoveryManagers/DiscoveryManager.js").DiscoveryManager<THandler>} constructor
	 * @param {TArgs} args
	 */
	addDiscoveryManager(constructor, ...args) {
		const discoveryManager = new constructor(...args);
		this.discoveryManagers.add(discoveryManager);
		discoveryManager.registerClient(this.clientType);
		return discoveryManager;
	}
}
