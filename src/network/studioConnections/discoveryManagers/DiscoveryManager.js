/**
 * @typedef AvailableStudioData
 * @property {import("../../../../src/util/mod.js").UuidString} id
 * @property {import("../StudioConnectionsManager.js").ClientType} clientType
 * @property {RemoteStudioMetaData?} projectMetaData
 */

/**
 * @typedef {AvailableStudioData & {connectionType: string}} AvailableConnectionData
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
 * @template {new (messageHandlerOptions: import("../messageHandlers/MessageHandler.js").MessageHandlerOptions, ...args: any[]) => import("../messageHandlers/MessageHandler.js").MessageHandler} TMessageHandler
 */
export class DiscoveryManager {
	static type = "";

	/**
	 * @param {TMessageHandler} messageHandlerConstructor
	 */
	constructor(messageHandlerConstructor) {
		/** @private */
		this.MessageHandlerConstructor = messageHandlerConstructor;
		/** @private @type {Map<import("../../../mod.js").UuidString, AvailableStudioData>} */
		this._availableConnections = new Map();
		/** @private @type {Set<() => void>} */
		this.onAvailableConnectionsChangedCbs = new Set();

		/** @protected @type {Map<import("../../../mod.js").UuidString, InstanceType<TMessageHandler>>} */
		this.activeConnections = new Map();
		/** @private @type {Set<OnConnectionCreatedCallback>} */
		this.onConnectionRequestCbs = new Set();
	}

	/**
	 * Called by the StudioConnectionsManager when removing a DiscoveryManager.
	 */
	destructor() {}

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
	 * @param {import("../../../mod.js").UuidString} id
	 */
	hasConnection(id) {
		return this._availableConnections.has(id);
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
	 * @template {[messageHandlerOptions: import("../messageHandlers/MessageHandler.js").MessageHandlerOptions, ...rest: any[]]} T
	 * @typedef {T extends [messageHandlerOptions: import("../messageHandlers/MessageHandler.js").MessageHandlerOptions, ...rest: infer Params] ?
	 * 	Params :
	 * never} MessageHandlerRestParameters
	 */

	/**
	 * @protected
	 * @param {import("../../../mod.js").UuidString} otherClientUuid
	 * @param {boolean} initiatedByMe True when the connection was initiated by our client (i.e. the client which you are currently instantiating a MessageHandler for).
	 * @param {MessageHandlerRestParameters<ConstructorParameters<TMessageHandler>>} args
	 */
	addActiveConnection(otherClientUuid, initiatedByMe, ...args) {
		const availableConnection = this._availableConnections.get(otherClientUuid);
		if (!availableConnection) {
			throw new Error(`Assertion failed, a new connection was created but "${otherClientUuid}" is not listed as an available connection.`);
		}
		const connectionData = /** @type {AvailableStudioData} */ (structuredClone(availableConnection));
		const castManager = /** @type {typeof DiscoveryManager} */ (this.constructor);
		const instance = new this.MessageHandlerConstructor({
			otherClientUuid,
			initiatedByMe,
			connectionData,
			connectionType: castManager.type,
		}, ...args);
		const castInstance = /** @type {InstanceType<TMessageHandler>} */ (instance);
		this.onConnectionRequestCbs.forEach(cb => cb(castInstance));
		return castInstance;
	}

	/** @typedef {(connection: InstanceType<TMessageHandler>) => void} OnConnectionCreatedCallback */

	/**
	 * Registers a callback that is fired when a new connection is initiated with this DiscoveryManager,
	 * either because `requestConnection` was called from this DiscoveryManager or from another DiscoveryManager which wants to connect to us.
	 * @param {OnConnectionCreatedCallback} cb
	 */
	onConnectionRequest(cb) {
		this.onConnectionRequestCbs.add(cb);
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

	/**
	 * Initiates a connection with another client.
	 * If the connection is successful, the `onConnectionCreated` callback gets fired.
	 * @param {import("../../../mod.js").UuidString} otherClientUuid
	 * @param {unknown} [connectionData] Optional data that can be sent to the client which allows
	 * it to determine whether the connection should be accepted or not.
	 */
	requestConnection(otherClientUuid, connectionData) {
		throw new Error("base class");
	}
}
