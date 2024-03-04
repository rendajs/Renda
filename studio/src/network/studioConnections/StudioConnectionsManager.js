import { DiscoveryManager } from "../../../../src/network/studioConnections/DiscoveryManager.js";
import { InternalDiscoveryMethod } from "../../../../src/network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js";
import { WebRtcDiscoveryMethod } from "../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js";
import { createStudioClientHandlers, createStudioHostHandlers, createStudioInspectorHandlers } from "./handlers.js";

/**
 * @typedef {import("../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionWithType & {connectionState: import("../../../../src/network/studioConnections/messageHandlers/MessageHandler.js").MessageHandlerStatus}} StudioConnectionData
 */

export class StudioConnectionsManager {
	#projectManager;
	#preferencesManager;
	/** @type {DiscoveryManager} */
	#discoveryManager;
	/** @type {InternalDiscoveryMethod} */
	#internalDiscoveryMethod;
	/** @type {WebRtcDiscoveryMethod?} */
	#webRtcDiscoveryMethod = null;

	/** @type {string?} */
	#webRtcDiscoveryEndpoint = null;

	/** @type {Set<import("../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").OnDiscoveryManagerWebRtcStatusChangeCallback>} */
	#onWebRtcDiscoveryServerStatusChangeCbs = new Set();
	/** @type {Set<() => void>} */
	#onConnectionsChangedCbs = new Set();

	/** @type {import("../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionProjectMetadata?} */
	#lastSentProjectMetadataInternal = null;
	/** @type {import("../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionProjectMetadata?} */
	#lastSentProjectMetadataWebRtc = null;

	/** @type {Map<import("../../../../src/mod.js").UuidString, {acceptHandler: () => void, rejectHandler: () => void}>} */
	#pendingIncomingConnections = new Map();

	/** @type {Map<import("../../../../src/mod.js").UuidString, import("../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<any, any>>} */
	#activeConnections = new Map();

	/**
	 * We don't allow all incoming connections, otherwise any browser tab would be able to connect to open projects
	 * simply by creating the discovery iframe and connecting to the first studio client it can find.
	 * But pages created by the build view should always be allowed.
	 * Therefore, we create tokens for every page created by the build view.
	 * Inspectors can provide these tokens when connecting, and we'll always allow the connection when the token is valid.
	 * @type {Set<string>}
	 */
	#connectionTokens = new Set();

	/**
	 * @param {import("../../projectSelector/ProjectManager.js").ProjectManager} projectManager
	 * @param {import("../../Studio.js").Studio["preferencesManager"]} preferencesManager
	 */
	constructor(projectManager, preferencesManager) {
		this.#projectManager = projectManager;
		this.#preferencesManager = preferencesManager;

		const { discoveryManager, internalDiscoveryMethod } = this.#createDiscoveryManager(this.#getDesiredClientType());
		this.#discoveryManager = discoveryManager;
		this.#internalDiscoveryMethod = internalDiscoveryMethod;

		projectManager.onProjectOpen(this.#updateDiscoveryManager);
		projectManager.onRootHasWritePermissionsChange(this.#updateDiscoveryManager);
		projectManager.onProjectOpenEntryChange(this.#updateDiscoveryManager);

		preferencesManager.onChange("studioConnections.enableRemoteDiscovery", null, this.#updateDiscoveryManager);
		preferencesManager.onChange("studioConnections.enableInternalDiscovery", null, this.#updateDiscoveryManager);
	}

	#getDefaultInternalDiscoveryUrl() {
		return new URL("internalDiscovery", window.location.href).href;
	}

	getDefaultWebRtcDiscoveryEndpoint() {
		if (window.location.hostname == "renda.studio" || window.location.hostname.endsWith(".renda.studio")) {
			return "wss://discovery.renda.studio/";
		} else {
			const protocol = window.location.protocol == "https:" ? "wss" : "ws";
			return `${protocol}://${window.location.host}/studioDiscovery`;
		}
	}

	#getDesiredClientType() {
		return this.#projectManager.currentProjectIsRemote ? "studio-client" : "studio-host";
	}

	/**
	 * @param {import("../../../../src/network/studioConnections/DiscoveryManager.js").ClientType} desiredClientType
	 */
	#createDiscoveryManager(desiredClientType) {
		const discoveryManager = new DiscoveryManager(desiredClientType);
		discoveryManager.onAvailableConnectionsChanged(() => {
			this.#fireOnConnectionsChanged();
		});
		discoveryManager.onConnectionRequest(connectionRequest => {
			// TODO: Add an allowlist #751
			// TODO: Automatically accept connections that are hosted by this studio instance #810
			let autoAccept = false;
			if (connectionRequest.initiatedByMe) {
				autoAccept = true;
			}

			let acceptHandler;
			if (discoveryManager.clientType == "studio-client" && connectionRequest.clientType == "studio-host") {
				if (!connectionRequest.initiatedByMe) {
					throw new Error('Assertion failed, a "studio-host" connection cannot connect to a "studio-client"');
				}
				acceptHandler = () => {
					const fileSystem = this.#projectManager.getRemoteFileSystem();
					/** @type {import("./handlers.js").StudioClientHostConnection} */
					const connection = connectionRequest.accept(createStudioClientHandlers(fileSystem));
					this.#projectManager.assignRemoteConnection(connection);
					this.#addActiveConnection(connection);
				};
			} else if (discoveryManager.clientType == "studio-host" && connectionRequest.clientType == "studio-client") {
				const fileSystem = this.#projectManager.currentProjectFileSystem;
				if (!fileSystem) {
					throw new Error("Failed to accept incoming connection, no active file system.");
				}
				acceptHandler = () => {
					/** @type {import("./handlers.js").StudioHostClientConnection} */
					const connection = connectionRequest.accept(createStudioHostHandlers(fileSystem));
					// TODO #857 Clean this up when the connection closes
					fileSystem.onChange(e => {
						connection.messenger.send["fileSystem.changeEvent"](e);
					});
					this.#addActiveConnection(connection);
				};
			} else if (connectionRequest.clientType == "inspector") {
				const { token } = connectionRequest.connectionRequestData;
				if (token && this.#connectionTokens.has(token)) {
					this.#connectionTokens.delete(token);
					autoAccept = true;
				}
				const assetManager = this.#projectManager.assetManager;
				if (!assetManager) {
					throw new Error("Failed to accept incoming connection, no active asset manager.");
				}
				acceptHandler = () => {
					const connection = connectionRequest.accept(createStudioInspectorHandlers(assetManager));
					this.#addActiveConnection(connection);
				};
			} else {
				let initiatorType;
				let receiverType;
				if (connectionRequest.initiatedByMe) {
					initiatorType = discoveryManager.clientType;
					receiverType = connectionRequest.clientType;
				} else {
					initiatorType = connectionRequest.clientType;
					receiverType = discoveryManager.clientType;
				}

				throw new Error(`Assertion failed, tried to connect two connections that are incompatible: "${initiatorType}" tried to connect to "${receiverType}"`);
			}

			if (autoAccept) {
				acceptHandler();
			} else {
				this.#addPendingIncomingConnection(connectionRequest.otherClientUuid, acceptHandler, () => {
					connectionRequest.reject();
				});
			}
		});

		const internalDiscoveryMethod = discoveryManager.addDiscoveryMethod(InternalDiscoveryMethod, this.#getDefaultInternalDiscoveryUrl());

		return { discoveryManager, internalDiscoveryMethod };
	}

	#updateDiscoveryManager = () => {
		const enableRemoteDiscovery = this.#preferencesManager.get("studioConnections.enableRemoteDiscovery", null);

		// Recreate the DiscoveryManager and InternalDiscoveryMethod when needed.
		const desiredClientType = this.#getDesiredClientType();
		if (desiredClientType != this.#discoveryManager.clientType) {
			this.#discoveryManager.destructor();
			this.#webRtcDiscoveryMethod = null;
			this.#lastSentProjectMetadataWebRtc = null;
			this.#lastSentProjectMetadataInternal = null;
			const { discoveryManager, internalDiscoveryMethod } = this.#createDiscoveryManager(desiredClientType);
			this.#discoveryManager = discoveryManager;
			this.#internalDiscoveryMethod = internalDiscoveryMethod;
		}

		// Create/destroy webrtc discovery method when needed
		const needsWebRtcDiscovery = enableRemoteDiscovery || this.#projectManager.currentProjectIsRemote;
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

		this.#updateProjectMetadata();
	};

	/**
	 * Adds a connection request to the list of pending incoming connections.
	 * This allows permission prompt UI to be shown, which can then accept or reject the
	 * connection via {@linkcode acceptIncomingConnection} or {@linkcode rejectIncomingConnection}.
	 * @param {import("../../../../src/mod.js").UuidString} connectionId
	 * @param {() => void} acceptHandler
	 * @param {() => void} rejectHandler
	 */
	#addPendingIncomingConnection(connectionId, acceptHandler, rejectHandler) {
		if (this.#pendingIncomingConnections.has(connectionId)) {
			this.rejectIncomingConnection(connectionId);
		}
		this.#pendingIncomingConnections.set(connectionId, { acceptHandler, rejectHandler });
		this.#fireOnConnectionsChanged();
	}

	/**
	 * @param {import("../../../../src/mod.js").UuidString} connectionId
	 */
	#getPendingIncomingConnection(connectionId) {
		const connectionData = this.#pendingIncomingConnections.get(connectionId);
		if (!connectionData) {
			throw new Error(`No pending connection request exists for connection "${connectionId}".`);
		}
		return connectionData;
	}

	/**
	 * Accepts a connection that currently has its connection state set to "incoming-permission-pending".
	 * @param {import("../../../../src/mod.js").UuidString} connectionId
	 */
	acceptIncomingConnection(connectionId) {
		const connectionData = this.#getPendingIncomingConnection(connectionId);
		connectionData.acceptHandler();
		this.#pendingIncomingConnections.delete(connectionId);
	}

	/**
	 * Rejects a connection that currently has its connection state set to "incoming-permission-pending".
	 * @param {import("../../../../src/mod.js").UuidString} connectionId
	 */
	rejectIncomingConnection(connectionId) {
		const connectionData = this.#getPendingIncomingConnection(connectionId);
		connectionData.rejectHandler();
		this.#pendingIncomingConnections.delete(connectionId);
	}

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
		for (const connection of this.#discoveryManager.availableConnections()) {
			/** @type {import("../../../../src/network/studioConnections/messageHandlers/MessageHandler.js").MessageHandlerStatus} */
			let connectionState = "disconnected";
			const pendingConnection = this.#pendingIncomingConnections.get(connection.id);
			if (pendingConnection) {
				connectionState = "incoming-permission-pending";
			}
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
		const metadata = this.#projectManager.getCurrentProjectMetadata();

		if (this.#webRtcDiscoveryMethod) {
			const enableRemoteDiscovery = this.#preferencesManager.get("studioConnections.enableRemoteDiscovery", null);
			const webRtcMetadata = enableRemoteDiscovery ? metadata : null;
			if (!this.#metadataEquals(webRtcMetadata, this.#lastSentProjectMetadataWebRtc)) {
				this.#webRtcDiscoveryMethod.setProjectMetadata(webRtcMetadata);
				this.#lastSentProjectMetadataWebRtc = webRtcMetadata;
			}
		}

		const enableInternalDiscovery = this.#preferencesManager.get("studioConnections.enableInternalDiscovery", null);
		const internalMetadata = enableInternalDiscovery ? metadata : null;
		if (!this.#metadataEquals(internalMetadata, this.#lastSentProjectMetadataInternal)) {
			this.#internalDiscoveryMethod.setProjectMetadata(internalMetadata);
			this.#lastSentProjectMetadataInternal = internalMetadata;
		}
	}

	/**
	 * @param {string?} endpoint
	 */
	setWebRtcDiscoveryEndpoint(endpoint) {
		this.#webRtcDiscoveryEndpoint = endpoint;
		this.#updateDiscoveryManager();
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
		this.#discoveryManager.requestConnection(otherClientUuid);
	}

	/**
	 * @param {import("../../../../src/network/studioConnections/DiscoveryManager.js").FindConnectionConfig} config
	 */
	async waitForConnection(config) {
		this.#updateDiscoveryManager();
		return await this.#discoveryManager.waitForConnection(config);
	}

	/**
	 * Returns the client uuid of the InternalDiscoveryMethod.
	 */
	async getInternalClientUuid() {
		return await this.#internalDiscoveryMethod.getClientUuid();
	}

	/**
	 * Any new connections can use this token and their connection will automatically be allowed,
	 * regardless of its origin, the connection type, or whether internal connections are enabled.
	 */
	createConnectionToken() {
		const token = crypto.randomUUID();
		this.#connectionTokens.add(token);
		return token;
	}
}
