import {StudioConnection} from "./StudioConnection.js";

/**
 * There are essentially three types of connection types.
 * - `"studio-host"` is a studio page which has an open project.
 * This connection type can only initiate new connections to `"inspector"` connections.
 * - `"studio-client"` is a studio page without an open project.
 * This connection type can initiate new connections to both `"studio-host"` and `"inspector"` connections.
 * - `"inspector"` is an application that makes use of Renda objects.
 * It could be a built application by a developer, or one hosted inside the Renda studio buildview.
 * `"inspector"` connections can initiate connections to both `"studio-host"` and `"studio-client"` connections,
 * though `"studio-host"` connections are preferred since `"studio-client"` connections will mostly just
 * forward any requests to the `"studio-host"` connection anyway.
 * @typedef {"studio-host" | "inspector" | "studio-client"} ClientType
 */

/**
 * @typedef AvailableConnection
 * @property {import("../../util/util.js").UuidString} id
 * @property {ClientType} clientType
 * @property {AvailableConnectionProjectMetadata?} projectMetadata
 */

/**
 * @typedef {AvailableConnection & {connectionType: string}} AvailableConnectionWithType
 */

/**
 * @typedef {object} AvailableConnectionProjectMetadata
 * @property {string} name
 * @property {boolean} fileSystemHasWritePermissions
 * @property {import("../../util/util.js").UuidString} uuid
 */
/**
 * @typedef OnConnectionCreatedRequest
 * @property {boolean} initiatedByMe
 * @property {ClientType} clientType
 * @property {<T extends import("../../mod.js").TypedMessengerSignatures>(reliableResponseHandlers: T) => StudioConnection<T, any>} accept Accepts the connection and
 * returns a StudioConnection with the provided response handlers.
 * If none of the registered callbacks call `accept()` (synchronously), the connection will be closed immediately.
 */

/**
 * @typedef FindConnectionConfig
 * @property {string} [connectionType]
 * @property {import("../../mod.js").UuidString} [projectUuid]
 * @property {import("../../mod.js").UuidString} [clientUuid]
 * @property {unknown} [connectionData]
 */

/**
 * The DiscoveryManager allows you to list available connections and connect to them.
 * You can add multiple DiscoveryMethods and observe changes to their available connections.
 */
export class DiscoveryManager {
	/** @typedef {(connectionRequest: OnConnectionCreatedRequest) => void} OnConnectionRequestCallback */

	/**
	 * The DiscoveryManager allows you to list available connections and connect to them.
	 * You can add multiple DiscoveryMethods and observe changes to their available connections.
	 *
	 * @example
	 * ```js
	 * const manager = new DiscoveryManager("inspector");
	 * const internalMethod = manager.addDiscoveryMethod(InternalDiscoveryMethod, "https://renda.studio/internalDiscovery");
	 * manager.onAvailableConnectionsChanged(() => {
	 * 	for (const connection of manager.availableConnections()) {
	 * 		manager.requestConnection(connection.id);
	 * 	}
	 * });
	 * ```
	 * @param {ClientType} clientType
	 */
	constructor(clientType) {
		/** @readonly */
		this.clientType = clientType;

		/** @private @type {AvailableConnectionProjectMetadata?} */
		this.projectMetadata = null;

		/** @protected @type {Set<import("./discoveryMethods/DiscoveryMethod.js").DiscoveryMethod<any>>} */
		this.discoveryMethods = new Set();

		/** @private @type {Set<() => void>} */
		this.onAvailableConnectionsChangedCbs = new Set();

		/** @private @type {Set<OnConnectionRequestCallback>} */
		this.onConnectionRequestCbs = new Set();
	}

	destructor() {
		for (const discoveryMethod of this.discoveryMethods) {
			discoveryMethod.destructor();
		}
	}

	/**
	 * @template {import("./discoveryMethods/DiscoveryMethod.js").DiscoveryMethod<any>} TManager
	 * @template {any[]} TArgs
	 * @param {new (...args: TArgs) => TManager} constructor
	 * @param {TArgs} args
	 */
	addDiscoveryMethod(constructor, ...args) {
		/** @type {import("./discoveryMethods/DiscoveryMethod.js").DiscoveryMethod<typeof import("./messageHandlers/MessageHandler.js").MessageHandler>} */
		const discoveryMethod = new constructor(...args);
		this.discoveryMethods.add(discoveryMethod);
		discoveryMethod.onAvailableConnectionsChanged(() => {
			this.onAvailableConnectionsChangedCbs.forEach(cb => cb());
		});
		discoveryMethod.onConnectionRequest(messageHandler => {
			let connectionCreated = false;
			for (const cb of this.onConnectionRequestCbs) {
				/** @type {OnConnectionCreatedRequest} */
				const request = {
					clientType: messageHandler.clientType,
					initiatedByMe: messageHandler.initiatedByMe,
					accept: reliableResponseHandlers => {
						connectionCreated = true;
						return new StudioConnection(messageHandler, reliableResponseHandlers);
					},
				};
				try {
					cb(request);
				} catch (e) {
					console.error(e);
				}
				if (connectionCreated) break;
			}
			if (!connectionCreated) {
				messageHandler.close();
			}
		});
		discoveryMethod.registerClient(this.clientType);
		if (this.projectMetadata) {
			discoveryMethod.setProjectMetadata(this.projectMetadata);
		}
		return /** @type {TManager} */ (discoveryMethod);
	}

	/**
	 * @param {import("./discoveryMethods/DiscoveryMethod.js").DiscoveryMethod<any>} discoveryMethod
	 */
	removeDiscoveryMethod(discoveryMethod) {
		if (this.discoveryMethods.has(discoveryMethod)) {
			discoveryMethod.destructor();
			this.discoveryMethods.delete(discoveryMethod);
			let hadConnections = false;
			for (const _ of discoveryMethod.availableConnections()) {
				hadConnections = true;
				break;
			}
			if (hadConnections) {
				this.onAvailableConnectionsChangedCbs.forEach(cb => cb());
			}
		}
	}

	/**
	 * @returns {Generator<AvailableConnectionWithType>}
	 */
	*availableConnections() {
		for (const discoveryMethod of this.discoveryMethods) {
			const castManager = /** @type {typeof import("./discoveryMethods/DiscoveryMethod.js").DiscoveryMethod} */ (discoveryMethod.constructor);
			for (const connection of discoveryMethod.availableConnections()) {
				yield {
					...connection,
					connectionType: castManager.type,
				};
			}
		}
	}

	/**
	 * Registers a callback that fires when the list of available connections changes.
	 * Either because a connection is added/removed, or if the project metadata of one of the
	 * connections is changed.
	 * You can use {@linkcode availableConnections} to iterate over the current list of available connections.
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
	 * Registers a callback that is fired when a new connection is initiated with this DiscoveryManager,
	 * either because `requestConnection` was called from this DiscoveryManager or from another DiscoveryManager which wants to connect to us.
	 * If the connection should be accepted, you should call `accept()` on the provided connectionRequest argument.
	 * If none of the registered callbacks call `accept()` (synchronously), the connection will be closed immediately.
	 * You can use this to filter specific connections based on their client type, origin or metadata.
	 * @param {OnConnectionRequestCallback} cb
	 */
	onConnectionRequest(cb) {
		this.onConnectionRequestCbs.add(cb);
	}

	/**
	 * @param {OnConnectionRequestCallback} cb
	 */
	removeOnConnectionRequest(cb) {
		this.onConnectionRequestCbs.delete(cb);
	}

	/**
	 * Attempts to initiate a new connection.
	 * If the connection succeeds, the {@linkcode onConnectionRequest} callback is fired.
	 *
	 * @param {import("../../mod.js").UuidString} otherClientUuid
	 * @param {unknown} [connectionData] Optional data that can be sent to the client which allows
	 * it to determine whether the connection should be accepted or not.
	 */
	requestConnection(otherClientUuid, connectionData) {
		for (const discoveryMethod of this.discoveryMethods.values()) {
			if (discoveryMethod.hasAvailableConnection(otherClientUuid)) {
				discoveryMethod.requestConnection(otherClientUuid, connectionData);
				return;
			}
		}
		throw new Error(`No connection with id "${otherClientUuid}" was found.`);
	}

	/**
	 * Attempts to connect to a specific connection based on the provided parameters.
	 * If the connection doesn't exist yet, this will wait for it to become available.
	 * @param {FindConnectionConfig} config
	 */
	async waitForConnectionAndRequest(config) {
		const connection = this.#findConnection(config);
		if (connection) {
			this.requestConnection(connection.id, config.connectionData);
		} else {
			/** @type {AvailableConnectionWithType} */
			const connection = await new Promise(resolve => {
				const cb = () => {
					const connection = this.#findConnection(config);
					if (connection) {
						this.removeOnAvailableConnectionsChanged(cb);
						resolve(connection);
					}
				};
				this.onAvailableConnectionsChanged(cb);
			});
			this.requestConnection(connection.id, config.connectionData);
		}
	}

	/**
	 * @param {FindConnectionConfig} config
	 */
	#findConnection(config) {
		for (const connection of this.availableConnections()) {
			if (config.connectionType && connection.connectionType != config.connectionType) continue;
			if (config.projectUuid && connection.projectMetadata?.uuid != config.projectUuid) continue;
			if (config.clientUuid && connection.id != config.clientUuid) continue;
			return connection;
		}
		return null;
	}
}
