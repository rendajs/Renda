import {DiscoveryManager} from "../../../../src/network/studioConnections/DiscoveryManager.js";
import {InternalDiscoveryMethod} from "../../../../src/network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js";
import {WebRtcDiscoveryMethod} from "../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js";
import {createStudioHostHandlers, createStudioInspectorHandlers} from "./handlers.js";

/**
 * @typedef {import("../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionWithType & {connectionState: import("../../../../src/network/studioConnections/messageHandlers/MessageHandler.js").MessageHandlerStatus}} StudioConnectionData
 */

export class StudioConnectionsManager {
	#projectManager;
	#preferencesManager;
	/** @type {DiscoveryManager?} */
	#discoveryManager = null;
	/** @type {InternalDiscoveryMethod?} */
	#internalDiscoveryMethod = null;
	/** @type {WebRtcDiscoveryMethod?} */
	#webRtcDiscoveryMethod = null;
	/** @type {import("../../util/fileSystems/StudioFileSystem.js").StudioFileSystem?} */
	#lastFileSystem = null;
	/** @type {import("../../assets/AssetManager.js").AssetManager?} */
	#lastAssetManager = null;

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
			return "wss://discovery.renda.studio/";
		} else {
			const protocol = window.location.protocol == "https:" ? "wss" : "ws";
			return `${protocol}://${window.location.host}/studioDiscovery`;
		}
	}

	#updateStudioConnectionsManager = () => {
		const enableRemoteDiscovery = this.#preferencesManager.get("studioConnections.enableRemoteDiscovery", null);

		/** @type {import("../../../../src/network/studioConnections/DiscoveryManager.js").ClientType?} */
		const desiredClientType = this.#projectManager.currentProjectIsRemote ? "studio-client" : "studio-host";

		if (
			this.#discoveryManager &&
			(
				desiredClientType != this.#discoveryManager.clientType ||
				this.#lastFileSystem != this.#projectManager.currentProjectFileSystem ||
				this.#lastAssetManager != this.#projectManager.assetManager
			)
		) {
			this.#discoveryManager.destructor();
			this.#discoveryManager = null;
			this.#webRtcDiscoveryMethod = null;
			this.#internalDiscoveryMethod = null;
			this.#lastFileSystem = null;
			this.#lastAssetManager = null;
			this.#lastSentProjectMetadataWebRtc = null;
			this.#lastSentProjectMetadataInternal = null;
		}

		if (desiredClientType && !this.#discoveryManager && this.#projectManager.currentProjectFileSystem && this.#projectManager.assetManager) {
			this.#lastFileSystem = this.#projectManager.currentProjectFileSystem;
			this.#lastAssetManager = this.#projectManager.assetManager;
			const certainFileSystem = this.#projectManager.currentProjectFileSystem;
			const certainAssetManager = this.#projectManager.assetManager;
			const discoveryManager = new DiscoveryManager(desiredClientType);
			this.#discoveryManager = discoveryManager;
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
						/** @type {import("./handlers.js").StudioClientHostConnection} */
						const connection = connectionRequest.accept({});
						this.#projectManager.assignRemoteConnection(connection);
						this.#addActiveConnection(connection);
					};
				} else if (discoveryManager.clientType == "studio-host" && connectionRequest.clientType == "studio-client") {
					acceptHandler = () => {
						const connection = connectionRequest.accept(createStudioHostHandlers(certainFileSystem));
						this.#addActiveConnection(connection);
					};
				} else if (connectionRequest.clientType == "inspector") {
					const {token} = connectionRequest.connectionRequestData;
					if (token && this.#connectionTokens.has(token)) {
						this.#connectionTokens.delete(token);
						autoAccept = true;
					}
					acceptHandler = () => {
						const connection = connectionRequest.accept(createStudioInspectorHandlers(certainAssetManager));
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
		}
		if (this.#discoveryManager) {
			// An internal discovery method is always needed
			if (!this.#internalDiscoveryMethod) {
				this.#internalDiscoveryMethod = this.#discoveryManager.addDiscoveryMethod(InternalDiscoveryMethod, this.#getDefaultInternalDiscoveryUrl());
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
		this.#pendingIncomingConnections.set(connectionId, {acceptHandler, rejectHandler});
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
		if (!this.#discoveryManager) return;
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
		if (!this.#discoveryManager) return;
		const metadata = this.#projectManager.getCurrentProjectMetadata();

		if (this.#webRtcDiscoveryMethod) {
			const enableRemoteDiscovery = this.#preferencesManager.get("studioConnections.enableRemoteDiscovery", null);
			const webRtcMetadata = enableRemoteDiscovery ? metadata : null;
			if (!this.#metadataEquals(webRtcMetadata, this.#lastSentProjectMetadataWebRtc)) {
				this.#webRtcDiscoveryMethod.setProjectMetadata(webRtcMetadata);
				this.#lastSentProjectMetadataWebRtc = webRtcMetadata;
			}
		}

		if (this.#internalDiscoveryMethod) {
			const enableInternalDiscovery = this.#preferencesManager.get("studioConnections.enableInternalDiscovery", null);
			const internalMetadata = enableInternalDiscovery ? metadata : null;
			if (!this.#metadataEquals(internalMetadata, this.#lastSentProjectMetadataInternal)) {
				this.#internalDiscoveryMethod.setProjectMetadata(internalMetadata);
				this.#lastSentProjectMetadataInternal = internalMetadata;
			}
		}
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
			throw new Error("Assertion failed, discovery manager does not exist.");
		}
		this.#discoveryManager.requestConnection(otherClientUuid);
	}

	/**
	 * @param {import("../../../../src/network/studioConnections/DiscoveryManager.js").FindConnectionConfig} config
	 */
	async waitForConnection(config) {
		this.#updateStudioConnectionsManager();
		if (!this.#discoveryManager) {
			throw new Error("Assertion failed, discovery manager does not exist.");
		}
		return await this.#discoveryManager.waitForConnection(config);
	}

	/**
	 * Returns the client uuid of the InternalDiscoveryMethod.
	 */
	async getInternalClientUuid() {
		if (this.#discoveryManager && this.#internalDiscoveryMethod) {
			return await this.#internalDiscoveryMethod.getClientUuid();
		}
		return null;
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
