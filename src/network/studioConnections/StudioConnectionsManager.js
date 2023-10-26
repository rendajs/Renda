import {StudioConnection} from "./StudioConnection.js";

/**
 * There are essentially three types of connection types.
 * - `"studio-host"` is a studio page which has an open project.
 * This connection type can only initiate new connections to `"inspector"` connections.
 * - `"studio-client"` is a studio page without an open project.
 * This connection type can initiate new connections to both `"studio-host"` and `"inspector"` connections.
 * - `"inspector"` is an application that makes use of Renda objects.
 * It could be a built application by a developer, or one hosted inside the Renda studio buildview.
 * `"inspector"` connections can only initiate connections to `"studio-host"` or `"studio-client"` connections,
 * though host connections are preferred since client connections will mostly forward any requests to the host studio connection.
 * @typedef {"studio-host" | "inspector" | "studio-client"} ClientType
 */

/**
 * @template {import("../../mod.js").TypedMessengerSignatures} TReliableRespondHandlers
 * @template {import("../../mod.js").TypedMessengerSignatures} TReliableRequestHandlers
 */
export class StudioConnectionsManager {
	/** @typedef {(connection: StudioConnection<TReliableRespondHandlers, TReliableRequestHandlers>) => boolean} OnConnectionCreatedCallback */
	/**
	 * @param {ClientType} clientType
	 * @param {TReliableRespondHandlers} reliableRespondHandlers
	 */
	constructor(clientType, reliableRespondHandlers) {
		/** @readonly */
		this.clientType = clientType;
		/** @private */
		this.reliableRespondHandlers = reliableRespondHandlers;

		/** @private @type {import("./discoveryManagers/DiscoveryManager.js").RemoteStudioMetaData?} */
		this.projectMetaData = null;

		/** @private @type {Set<import("./discoveryManagers/DiscoveryManager.js").DiscoveryManager<any>>} */
		this.discoveryManagers = new Set();

		/** @private @type {Set<() => void>} */
		this.onConnectionsChangedCbs = new Set();

		/** @private @type {Set<OnConnectionCreatedCallback>} */
		this.onConnectionCreatedCbs = new Set();
	}

	destructor() {
		for (const discoveryManager of this.discoveryManagers) {
			discoveryManager.destructor();
		}
	}

	/**
	 * @template {import("./discoveryManagers/DiscoveryManager.js").DiscoveryManager<any>} TManager
	 * @template {any[]} TArgs
	 * @param {new (...args: TArgs) => TManager} constructor
	 * @param {TArgs} args
	 */
	addDiscoveryManager(constructor, ...args) {
		/** @type {import("./discoveryManagers/DiscoveryManager.js").DiscoveryManager<typeof import("./messageHandlers/MessageHandler.js").MessageHandler>} */
		const discoveryManager = new constructor(...args);
		this.discoveryManagers.add(discoveryManager);
		discoveryManager.onAvailableConnectionsChanged(() => {
			this.onConnectionsChangedCbs.forEach(cb => cb());
		});
		discoveryManager.onConnectionCreated(messageHandler => {
			/** @type {StudioConnection<TReliableRespondHandlers, TReliableRequestHandlers>} */
			const studioConnection = new StudioConnection(messageHandler, this.reliableRespondHandlers);
			let anySuccess = false;
			for (const cb of this.onConnectionCreatedCbs) {
				let success = false;
				try {
					success = cb(studioConnection);
				} catch (e) {
					console.error(e);
				}
				anySuccess = anySuccess || success;
			}
			if (!anySuccess) {
				studioConnection.close();
			}
		});
		discoveryManager.registerClient(this.clientType);
		if (this.projectMetaData) {
			discoveryManager.setProjectMetaData(this.projectMetaData);
		}
		return /** @type {TManager} */ (discoveryManager);
	}

	/**
	 * @param {import("./discoveryManagers/DiscoveryManager.js").DiscoveryManager<any>} discoveryManager
	 */
	removeDiscoveryManager(discoveryManager) {
		if (this.discoveryManagers.has(discoveryManager)) {
			discoveryManager.destructor();
			this.discoveryManagers.delete(discoveryManager);
		}
	}

	*availableConnections() {
		for (const discoveryManager of this.discoveryManagers) {
			yield* discoveryManager.availableConnections();
		}
	}

	/**
	 * @param {import("./discoveryManagers/DiscoveryManager.js").RemoteStudioMetaData?} metaData
	 */
	setProjectMetaData(metaData) {
		this.projectMetaData = metaData;
		for (const discoveryManager of this.discoveryManagers.values()) {
			discoveryManager.setProjectMetaData(metaData);
		}
	}

	/**
	 * @param {() => void} cb
	 */
	onConnectionsChanged(cb) {
		this.onConnectionsChangedCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	removeOnConnectionsChanged(cb) {
		this.onConnectionsChangedCbs.delete(cb);
	}

	/**
	 * Registers a callback that is fired when a new connection is initiated with this DiscoveryManager,
	 * either because `requestConnection` was called from this DiscoveryManager or from another DiscoveryManager which wants to connect to us.
	 * If the connection should be accepted, you should return `true` from the callback.
	 * if all registered callbacks return `false`, the connection will be closed immediately.
	 * You can use this to filter ignore specific connections based on their client type, origin or metadata.
	 * @param {OnConnectionCreatedCallback} cb
	 */
	onConnectionCreated(cb) {
		this.onConnectionCreatedCbs.add(cb);
	}

	/**
	 * @param {OnConnectionCreatedCallback} cb
	 */
	removeOnConnectionCreated(cb) {
		this.onConnectionCreatedCbs.delete(cb);
	}

	/**
	 * Attempts to initiate a new connection.
	 * If the connection succeeds, state changes can be observed using {@linkcode onConnectionsChanged}.
	 * @param {import("../../mod.js").UuidString} id
	 * @param {unknown} [connectionData] Optional data that can be sent to the client which allows
	 * it to determine whether the connection should be accepted or not.
	 */
	requestConnection(id, connectionData) {
		for (const discoveryManager of this.discoveryManagers.values()) {
			if (discoveryManager.hasConnection(id)) {
				discoveryManager.requestConnection(id, connectionData);
				return;
			}
		}
		throw new Error(`No connection with id ${id} was found.`);
	}
}
