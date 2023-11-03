import {DiscoveryManager} from "../../../../src/network/studioConnections/DiscoveryManager.js";
import {InternalDiscoveryMethod} from "../../../../src/network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js";
import {WebRtcDiscoveryMethod} from "../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js";
import {createStudioHostHandlers} from "./handlers.js";

/**
 * @typedef {import("../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionWithType & {connectionState: import("../../../../src/network/studioConnections/messageHandlers/MessageHandler.js").MessageHandlerStatus}} StudioConnectionData
 */

/** @typedef {import("../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<{}, ReturnType<createStudioHostHandlers>>} StudioClientHostConnection */

export class StudioConnectionsManager {
	#projectManager;
	#preferencesManager;
	/** @type {DiscoveryManager?} */
	#discoveryManager = null;
	/** @type {InternalDiscoveryMethod?} */
	#internalDiscoveryMethod = null;
	/** @type {WebRtcDiscoveryMethod?} */
	#webRtcDiscoveryMethod = null;

	/** @type {string?} */
	#webRtcDiscoveryEndpoint = null;

	/** @type {Set<import("../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").OnDiscoveryManagerWebRtcStatusChangeCallback>} */
	#onWebRtcDiscoveryServerStatusChangeCbs = new Set();
	/** @type {Set<() => void>} */
	#onConnectionsChangedCbs = new Set();

	/** @type {import("../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionProjectMetadata?} */
	#lastSentProjectMetadata = null;

	/** @type {Map<import("../../../../src/mod.js").UuidString, import("../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<any, any>>} */
	#activeConnections = new Map();

	/**
	 * @param {import("../../projectSelector/ProjectManager.js").ProjectManager} projectManager
	 * @param {import("../../Studio.js").Studio["preferencesManager"]} preferencesManager
	 */
	constructor(projectManager, preferencesManager) {
		this.#projectManager = projectManager;
		this.#preferencesManager = preferencesManager;

		projectManager.onProjectOpen(this.#updateStudioConnectionsManager);
		projectManager.onRootHasWritePermissionsChange(this.#updateStudioConnectionsManager);
		projectManager.onProjectOpenEntryChange(this.#updateStudioConnectionsManager);

		preferencesManager.onChange("studioConnections.enableRemoteDiscovery", null, this.#updateStudioConnectionsManager);
		preferencesManager.onChange("studioConnections.enableInternalDiscovery", null, this.#updateStudioConnectionsManager);
	}

	#getDefaultInternalDiscoveryUrl() {
		return new URL("internalDiscovery", window.location.href).href;
	}

	getDefaultWebRtcDiscoveryEndpoint() {
		if (window.location.hostname == "renda.studio" || window.location.hostname.endsWith(".renda.studio")) {
			return "discovery.renda.studio";
		} else {
			const protocol = window.location.protocol == "https:" ? "wss" : "ws";
			return `${protocol}://${window.location.host}/studioDiscovery`;
		}
	}

	/**
	 * @param {import("../../../../src/network/studioConnections/DiscoveryManager.js").ClientType} initiatorType
	 * @param {import("../../../../src/network/studioConnections/DiscoveryManager.js").ClientType} receiverType
	 */
	#isValidConnectionConfiguration(initiatorType, receiverType) {
		if (initiatorType == receiverType) return false;
		if (receiverType == "studio-client" && initiatorType == "studio-host") return false;

		return true;
	}

	#updateStudioConnectionsManager = () => {
		const allowRemoteIncoming = this.#preferencesManager.get("studioConnections.enableRemoteDiscovery", null);
		const allowInternalIncoming = this.#preferencesManager.get("studioConnections.enableInternalDiscovery", null);

		/** @type {import("../../../../src/network/studioConnections/DiscoveryManager.js").ClientType?} */
		const desiredClientType = this.#projectManager.currentProjectIsRemote ? "studio-client" : "studio-host";

		if (this.#discoveryManager && (!desiredClientType || desiredClientType != this.#discoveryManager.clientType)) {
			this.#discoveryManager.destructor();
			this.#discoveryManager = null;
			this.#internalDiscoveryMethod = null;
			this.#webRtcDiscoveryMethod = null;
		}

		if (desiredClientType && !this.#discoveryManager && this.#projectManager.currentProjectFileSystem) {
			const certainFileSystem = this.#projectManager.currentProjectFileSystem;
			const discoveryManager = new DiscoveryManager(desiredClientType);
			this.#discoveryManager = discoveryManager;
			this.#lastSentProjectMetadata = null;
			discoveryManager.onAvailableConnectionsChanged(() => {
				if (discoveryManager != this.#discoveryManager) {
					throw new Error("Assertion failed, studio connections manager callback fired after it has been destructed.");
				}
				this.#fireOnConnectionsChanged();
			});
			discoveryManager.onConnectionRequest(connectionRequest => {
				if (discoveryManager != this.#discoveryManager) {
					throw new Error("Assertion failed, studio connections manager callback fired after it has been destructed.");
				}

				let initiatorType;
				let receiverType;
				if (connectionRequest.initiatedByMe) {
					initiatorType = discoveryManager.clientType;
					receiverType = connectionRequest.clientType;
				} else {
					initiatorType = connectionRequest.clientType;
					receiverType = discoveryManager.clientType;
				}

				if (!this.#isValidConnectionConfiguration(initiatorType, receiverType)) {
					throw new Error(`Assertion failed, tried to connect two connections that are incompatible: "${initiatorType}" tried to connect to "${receiverType}"`);
				}

				// TODO: Add an allowlist #751

				if (connectionRequest.initiatedByMe) {
					/** @type {StudioClientHostConnection} */
					const connection = connectionRequest.accept({});
					this.#projectManager.assignRemoteConnection(connection);
					this.#addActiveConnection(connection);
				}
				if (discoveryManager.clientType == "studio-host" && connectionRequest.clientType == "studio-client") {
					const connection = connectionRequest.accept(createStudioHostHandlers(certainFileSystem));
					this.#addActiveConnection(connection);
				}
			});
		}
		if (this.#discoveryManager) {
			// create/destroy internal discovery method when needed
			const needsInternalDiscovery = allowInternalIncoming || this.#projectManager.currentProjectIsRemote;
			if (this.#internalDiscoveryMethod && !needsInternalDiscovery) {
				this.#discoveryManager.removeDiscoveryMethod(this.#internalDiscoveryMethod);
			} else if (!this.#internalDiscoveryMethod && needsInternalDiscovery) {
				this.#internalDiscoveryMethod = this.#discoveryManager.addDiscoveryMethod(InternalDiscoveryMethod, this.#getDefaultInternalDiscoveryUrl());
			}

			// create/destroy webrtc discovery method when needed
			const needsWebRtcDiscovery = allowRemoteIncoming || this.#projectManager.currentProjectIsRemote;
			const desiredWebRtcEndpoint = this.#webRtcDiscoveryEndpoint || this.getDefaultWebRtcDiscoveryEndpoint();
			if (this.#webRtcDiscoveryMethod && (!needsWebRtcDiscovery || this.#webRtcDiscoveryMethod.endpoint != desiredWebRtcEndpoint)) {
				this.#discoveryManager.removeDiscoveryMethod(this.#webRtcDiscoveryMethod);
				this.#onWebRtcDiscoveryServerStatusChangeCbs.forEach(cb => cb("disconnected"));
				this.#webRtcDiscoveryMethod = null;
			}
			if (!this.#webRtcDiscoveryMethod && needsWebRtcDiscovery) {
				this.#webRtcDiscoveryMethod = this.#discoveryManager.addDiscoveryMethod(WebRtcDiscoveryMethod, desiredWebRtcEndpoint);
				this.#webRtcDiscoveryMethod.onStatusChange(status => {
					this.#onWebRtcDiscoveryServerStatusChangeCbs.forEach(cb => cb(status));
				});
				const status = this.#webRtcDiscoveryMethod.status;
				this.#onWebRtcDiscoveryServerStatusChangeCbs.forEach(cb => cb(status));
			}
		}

		this.#updateProjectMetadata();
	};

	/**
	 * Adds the connection to the list of active connections and listens for status changes.
	 * @param {import("../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<any, any>} connection
	 */
	#addActiveConnection(connection) {
		this.#activeConnections.set(connection.otherClientUuid, connection);
		connection.onStatusChange(() => {
			this.#fireOnConnectionsChanged();
		});
		this.#fireOnConnectionsChanged();
	}

	/**
	 * @returns {Generator<StudioConnectionData>}
	 */
	*getConnections() {
		if (!this.#discoveryManager) return;
		for (const connection of this.#discoveryManager.availableConnections()) {
			/** @type {import("../../../../src/network/studioConnections/messageHandlers/MessageHandler.js").MessageHandlerStatus} */
			let connectionState = "disconnected";
			const activeConnection = this.#activeConnections.get(connection.id);
			if (activeConnection) {
				connectionState = activeConnection.status;
			}
			yield {
				...connection,
				connectionState,
			};
		}
	}

	#fireOnConnectionsChanged() {
		this.#onConnectionsChangedCbs.forEach(cb => cb());
	}

	/**
	 * @param {() => void} cb
	 */
	onConnectionsChanged(cb) {
		this.#onConnectionsChangedCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	removeOnConnectionsChanged(cb) {
		this.#onConnectionsChangedCbs.delete(cb);
	}

	/**
	 * @param {import("../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionProjectMetadata?} oldData
	 * @param {import("../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionProjectMetadata?} newData
	 */
	#metadataEquals(oldData, newData) {
		if (oldData == newData) return true;
		if (
			newData && oldData &&
			oldData.name == newData.name &&
			oldData.uuid == newData.uuid &&
			oldData.fileSystemHasWritePermissions == newData.fileSystemHasWritePermissions
		) return true;

		return false;
	}

	/**
	 * Sends the current state of project metadata to remote and internal studio connections.
	 */
	#updateProjectMetadata() {
		if (!this.#discoveryManager) return;
		const metadata = this.#projectManager.getCurrentProjectMetadata();
		if (this.#metadataEquals(metadata, this.#lastSentProjectMetadata)) return;
		this.#discoveryManager.setProjectMetadata(metadata);
	}

	/**
	 * @param {string?} endpoint
	 */
	setWebRtcDiscoveryEndpoint(endpoint) {
		this.#webRtcDiscoveryEndpoint = endpoint;
		this.#updateStudioConnectionsManager();
	}

	/** @type {import("../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").DiscoveryServerStatusType} */
	get webRtcDiscoveryServerStatus() {
		if (!this.#webRtcDiscoveryMethod) return "disconnected";
		return this.#webRtcDiscoveryMethod.status;
	}

	/**
	 * @param {import("../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").OnDiscoveryManagerWebRtcStatusChangeCallback} cb
	 */
	onWebRtcDiscoveryServerStatusChange(cb) {
		this.#onWebRtcDiscoveryServerStatusChangeCbs.add(cb);
	}

	/**
	 * @param {import("../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").OnDiscoveryManagerWebRtcStatusChangeCallback} cb
	 */
	removeOnWebRtcDiscoveryServerStatusChange(cb) {
		this.#onWebRtcDiscoveryServerStatusChangeCbs.delete(cb);
	}

	/**
	 * Attempts to initiate a new connection.
	 * If the connection succeeds, state changes can be observed using {@linkcode onConnectionsChanged}.
	 * @param {import("../../../../src/mod.js").UuidString} otherClientUuid
	 */
	requestConnection(otherClientUuid) {
		if (!this.#discoveryManager) {
			throw new Error("Assertion failed, studio connections manager does not exist");
		}
		this.#discoveryManager.requestConnection(otherClientUuid);
	}

	/**
	 * @typedef FindConnectionConfig
	 * @property {string} connectionType
	 * @property {import("../../../../src/mod.js").UuidString} projectUuid
	 */

	/**
	 * Attempts to connect to a specific connection.
	 * If the connection doesn't exist yet, this will wait for it to become available.
	 * @param {FindConnectionConfig} config
	 */
	async requestSpecificConnection(config) {
		this.#updateStudioConnectionsManager();
		const connection = this.#findConnection(config);
		if (connection) {
			this.requestConnection(connection.id);
		} else {
			/** @type {import("../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionWithType} */
			const connection = await new Promise(resolve => {
				const cb = () => {
					const connection = this.#findConnection(config);
					if (connection) {
						this.removeOnConnectionsChanged(cb);
						resolve(connection);
					}
				};
				this.onConnectionsChanged(cb);
			});
			this.requestConnection(connection.id);
		}
	}

	/**
	 * @param {FindConnectionConfig} config
	 */
	#findConnection(config) {
		if (!this.#discoveryManager) return null;
		for (const connection of this.#discoveryManager.availableConnections()) {
			if (
				connection.projectMetadata?.uuid == config.projectUuid &&
				connection.connectionType == config.connectionType
			) {
				return connection;
			}
		}
		return null;
	}

	/**
	 * Returns the client uuid of the InternalDiscoveryMethod.
	 */
	async getInternalClientUuid() {
		if (!this.#discoveryManager) return null;
		if (!this.#internalDiscoveryMethod) return null;
		return this.#internalDiscoveryMethod.getClientUuid();
	}

	/**
	 * We don't allow all incoming connections, otherwise any browser tab would be able to connect to open projects
	 * simply by creating the discovery iframe and connecting to the first studio client it can find.
	 * But pages created by the build view should always be allowed.
	 * Therefore, we create tokens for every page created by the build view.
	 * Inspectors can provide these tokens when connecting, and we'll always allow the connection when the token is valid.
	 * @type {Set<string>}
	 */
	#internalConnectionTokens = new Set();

	/**
	 * Any new connections can use this token and their connection will automatically be allowed,
	 * regardless of its origin, the connection type, or whether internal connections are enabled.
	 */
	createInternalConnectionToken() {
		const token = crypto.randomUUID();
		this.#internalConnectionTokens.add(token);
		return token;
	}

	/**
	 * Prevents any new connections from being made using this token.
	 * This doesn't close existing connections that were made using the token.
	 * @param {string} token
	 */
	deleteConnectionToken(token) {
		this.#internalConnectionTokens.delete(token);
	}
}
