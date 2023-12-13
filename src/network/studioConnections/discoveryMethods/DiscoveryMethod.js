/**
 * Base class for DiscoveryMethods.
 * A DiscoveryMethod can list available connections and provides functionality for connecting to them
 * DiscoveryMethods are usually created via `DiscoveryManager.addDiscoveryMethod()`.
 * @template {new (messageHandlerOptions: import("../messageHandlers/MessageHandler.js").MessageHandlerOptions, ...args: any[]) => import("../messageHandlers/MessageHandler.js").MessageHandler} TMessageHandler
 */
export class DiscoveryMethod {
	/**
	 * An identifier that is used when listing available connections.
	 */
	static type = "";

	/**
	 * @param {TMessageHandler} messageHandlerConstructor
	 */
	constructor(messageHandlerConstructor) {
		/** @private */
		this.MessageHandlerConstructor = messageHandlerConstructor;
		/** @private @type {Map<import("../../../mod.js").UuidString, import("../DiscoveryManager.js").AvailableConnection>} */
		this._availableConnections = new Map();
		/** @protected @type {Map<import("../../../mod.js").UuidString, InstanceType<TMessageHandler>>} */
		this.activeConnections = new Map();
		/** @private @type {Set<() => void>} */
		this.onAvailableConnectionsChangedCbs = new Set();

		/** @private @type {Set<OnConnectionRequestCallback>} */
		this.onConnectionRequestCbs = new Set();
	}

	/**
	 * Called by the DiscoveryManager when removing this DiscoveryMethod.
	 * You should use `DiscoveryManager.removeDiscoveryMethod()` instead of calling this directly.
	 * Cleans up any resources created for discovering other clients,
	 * but doesn't necessarily close created MessageHandlers.
	 */
	destructor() {}

	/**
	 * Registers the current client, letting the discovery method know about its existence.
	 * This should broadcast the existence of this client and its type to other clients.
	 *
	 * @param {import("../DiscoveryManager.js").ClientType} clientType
	 */
	registerClient(clientType) {
		throw new Error("base class");
	}

	/**
	 * Call this when another client becomes available.
	 *
	 * @protected
	 * @param {import("../DiscoveryManager.js").AvailableConnection} connection
	 */
	addAvailableConnection(connection) {
		this._addAvailableConnectionInternal(connection);
	}

	/**
	 * @protected
	 * @param {import("../DiscoveryManager.js").AvailableConnection[]} connections
	 */
	setAvailableConnections(connections) {
		if (connections.length == 0 && this._availableConnections.size == 0) return;
		this.clearAvailableConnections(false);
		for (const connection of connections) {
			this._addAvailableConnectionInternal(connection, false);
		}
		this.fireAvailableConnectionsChanged();
	}

	/**
	 * @private
	 * @param {import("../DiscoveryManager.js").AvailableConnection} connection
	 */
	_addAvailableConnectionInternal(connection, fireAvailableConnectionsChanged = true) {
		const clonedConnection = /** @type {import("../DiscoveryManager.js").AvailableConnection} */ (structuredClone(connection));
		this._availableConnections.set(connection.id, clonedConnection);
		if (fireAvailableConnectionsChanged) this.fireAvailableConnectionsChanged();
	}

	/**
	 * Call this when another client is no longer available.
	 *
	 * @protected
	 * @param {import("../../../mod.js").UuidString} clientUuid
	 */
	removeAvailableConnection(clientUuid) {
		this._availableConnections.delete(clientUuid);
		this.fireAvailableConnectionsChanged();
	}

	/**
	 * Call this when the connection to your discovery server closes for instance.
	 *
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
	 * @param {import("../../../mod.js").UuidString} clientUuid
	 */
	hasAvailableConnection(clientUuid) {
		return this._availableConnections.has(clientUuid);
	}

	/**
	 * Notify other clients about the project metadata of this client.
	 * This way other clients can display things such as the project name in their UI.
	 * @param {import("../DiscoveryManager.js").AvailableConnectionProjectMetadata?} metadata
	 */
	setProjectMetadata(metadata) {
		throw new Error("base class");
	}

	/**
	 * Updates the metadata of a specific connection and fires change events.
	 * @protected
	 * @param {import("../../../mod.js").UuidString} clientUuid
	 * @param {import("../DiscoveryManager.js").AvailableConnectionProjectMetadata?} metadata
	 */
	setConnectionProjectMetadata(clientUuid, metadata) {
		const connection = this._availableConnections.get(clientUuid);
		if (connection) {
			connection.projectMetadata = metadata;
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
	 * This should be called when either the creator of this instance called {@linkcode requestConnection}
	 * or another client started a connection to us.
	 * @protected
	 * @param {import("../../../mod.js").UuidString} otherClientUuid
	 * @param {boolean} initiatedByMe True when the connection was initiated by our client (i.e. the client which you are currently instantiating a MessageHandler for).
	 * @param {import("../DiscoveryManager.js").ConnectionRequestData} connectionRequestData Extra data passed on by the other client when they requested a connection with us.
	 * @param {MessageHandlerRestParameters<ConstructorParameters<TMessageHandler>>} args
	 */
	addActiveConnection(otherClientUuid, initiatedByMe, connectionRequestData, ...args) {
		const availableConnection = this._availableConnections.get(otherClientUuid);
		if (!availableConnection) {
			throw new Error(`Assertion failed, a new connection was created but "${otherClientUuid}" is not listed as an available connection.`);
		}
		const connectionData = /** @type {import("../DiscoveryManager.js").AvailableConnection} */ (structuredClone(availableConnection));
		const castManager = /** @type {typeof DiscoveryMethod} */ (this.constructor);
		const instance = new this.MessageHandlerConstructor({
			otherClientUuid,
			initiatedByMe,
			connectionData,
			connectionRequestData: /** @type {import("../DiscoveryManager.js").ConnectionRequestData} */ (structuredClone(connectionRequestData)),
			connectionType: castManager.type,
		}, ...args);
		const castInstance = /** @type {InstanceType<TMessageHandler>} */ (instance);
		this.onConnectionRequestCbs.forEach(cb => cb(castInstance));
		this.activeConnections.set(otherClientUuid, castInstance);
		return castInstance;
	}

	/** @typedef {(connection: InstanceType<TMessageHandler>) => void} OnConnectionRequestCallback */

	/**
	 * Registers a callback that is fired when a new connection is initiated with this DiscoveryMethod,
	 * either because `requestConnection` was called from this DiscoveryMethod or from another DiscoveryMethod which wants to connect to us.
	 * @param {OnConnectionRequestCallback} cb
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
	 * This should call {@linkcode addActiveConnection} on both this instance and
	 * on the instance of the other client for which the connection was requested.
	 *
	 * @param {import("../../../mod.js").UuidString} otherClientUuid
	 * @param {import("../DiscoveryManager.js").ConnectionRequestData} [connectionRequestData] Optional data that can be sent to the client which allows
	 * it to determine whether the connection should be accepted or not.
	 */
	requestConnection(otherClientUuid, connectionRequestData) {
		throw new Error("base class");
	}
}
