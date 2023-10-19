/**
 * @typedef {object} AvailableStudioData
 * @property {import("../../../../src/util/mod.js").UuidString} id
 * @property {import("../StudioConnectionsManager.js").ClientType} clientType
 * @property {RemoteStudioMetaData?} projectMetaData
 */
/**
 * @typedef {object} RemoteStudioMetaData
 * @property {string} name
 * @property {boolean} fileSystemHasWritePermissions
 * @property {import("../../../../src/util/mod.js").UuidString} uuid
 */

/**
 * Base class for DiscoveryManagers.
 * A DiscoveryManager can list multiple available connections without connecting to them.
 * @template {import("../messageHandlers/MessageHandler.js").MessageHandler} TMessageHandler
 */
export class DiscoveryManager {
	static type = "";

	constructor() {
		/** @private @type {Map<import("../../../mod.js").UuidString, AvailableStudioData>} */
		this._availableConnections = new Map();
		/** @private @type {Set<() => void>} */
		this.onAvailableConnectionsChangedCbs = new Set();

		/** @protected @type {Map<import("../../../mod.js").UuidString, TMessageHandler>} */
		this.activeConnections = new Map();
		/** @private @type {Set<OnConnectionCreatedCallback>} */
		this.onConnectionCreatedCbs = new Set();
	}

	/**
	 * Registers the current client, letting the discovery server know about its existence.
	 * This broadcasts the existence of this client and its type to other clients,
	 * allowing them to initialize connections to this client.
	 * @param {import("../StudioConnectionsManager.js").ClientType} clientType
	 */
	registerClient(clientType) {
		throw new Error("base class");
	}

	/**
	 * @protected
	 * @param {AvailableStudioData} connection
	 */
	addAvailableConnection(connection, fireAvailableConnectionsChanged = true) {
		this._availableConnections.set(connection.id, {
			id: connection.id,
			clientType: connection.clientType,
			projectMetaData: connection.projectMetaData,
		});
		if (fireAvailableConnectionsChanged) this.fireAvailableConnectionsChanged();
	}

	/**
	 * @protected
	 * @param {import("../../../mod.js").UuidString} id
	 */
	removeAvailableConnection(id) {
		this._availableConnections.delete(id);
		this.fireAvailableConnectionsChanged();
	}

	/**
	 * @protected
	 */
	clearAvailableConnections(fireAvailableConnectionsChanged = true) {
		this._availableConnections.clear();
		if (fireAvailableConnectionsChanged) this.fireAvailableConnectionsChanged();
	}

	*availableConnections() {
		yield* this._availableConnections.values();
	}

	/**
	 * Updates the metadata of a specific connection and fires change events.
	 * @protected
	 * @param {import("../../../mod.js").UuidString} id
	 * @param {RemoteStudioMetaData?} metaData
	 */
	setConnectionProjectMetaData(id, metaData) {
		const connection = this._availableConnections.get(id);
		if (connection) {
			connection.projectMetaData = metaData;
			this.fireAvailableConnectionsChanged();
		}
	}

	/**
	 * @protected
	 * @param {import("../../../mod.js").UuidString} id
	 * @param {TMessageHandler} connection
	 */
	addActiveConnection(id, connection) {
		this.onConnectionCreatedCbs.forEach(cb => cb(connection));
	}

	/** @typedef {(connection: TMessageHandler) => void} OnConnectionCreatedCallback */

	/**
	 * Registers a callback that is fired when a new connection is initiated with this DiscoveryManager,
	 * either because `requestConnection` was called from this DiscoveryManager or from another DiscoveryManager which wants to connect to us.
	 * You may choose to ignore the connection if you determine that the origin is not allowlisted,
	 * or if the type of client is not allowed.
	 * When doing so, it's best to immediately call `close()` on the provided MessageHandler.
	 * @param {OnConnectionCreatedCallback} cb
	 */
	onConnectionCreated(cb) {
		this.onConnectionCreatedCbs.add(cb);
	}

	/**
	 * Notify other clients about the project metadata of this client.
	 * This way other clients can display things such as the project name in their UI.
	 * @param {RemoteStudioMetaData?} metaData
	 */
	setProjectMetaData(metaData) {
		throw new Error("base class");
	}

	/**
	 * @param {() => void} cb
	 */
	onAvailableConnectionsChanged(cb) {
		this.onAvailableConnectionsChangedCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	removeOnAvailableConnectionsChanged(cb) {
		this.onAvailableConnectionsChangedCbs.delete(cb);
	}

	/**
	 * @protected
	 */
	fireAvailableConnectionsChanged() {
		this.onAvailableConnectionsChangedCbs.forEach(cb => cb());
	}
}
