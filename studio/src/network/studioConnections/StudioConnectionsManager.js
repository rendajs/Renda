import {StudioConnection} from "./StudioConnection.js";
import {MessageHandlerWebRtc} from "./messageHandlers/MessageHandlerWebRtc.js";
import {MessageHandlerInternal} from "./messageHandlers/MessageHandlerInternal.js";
import {ProtocolManager} from "./ProtocolManager.js";
import {InternalDiscoveryManager} from "../../../../src/inspector/InternalDiscoveryManager.js";

/**
 * @fileoverview The StudioConnectionsManager is responsible for managing connections with
 * either other studio instances, or inspectors from running applications. The manager does not control
 * any ui, but the ContentWindowConnections does tap into this manager in order to get the
 * list of connections to display etc.
 * This manager takes care of both internal as well as remote connections.
 */

/**
 * @typedef {object} RemoteStudioMetaData
 * @property {string} name
 * @property {boolean} fileSystemHasWritePermissions
 * @property {import("../../../../src/util/mod.js").UuidString} uuid
 */
/** @typedef {"webRtc" | "internal"} MessageHandlerType */
/** @typedef {"studio" | "inspector"} ClientType */
/**
 * @typedef {object} AvailableStudioData
 * @property {import("../../../../src/util/mod.js").UuidString} id
 * @property {MessageHandlerType} messageHandlerType
 * @property {ClientType} clientType
 * @property {RemoteStudioMetaData?} projectMetaData
 */

/** @typedef {Map<import("../../../../src/util/mod.js").UuidString, AvailableStudioData>} AvailableStudioDataList */
/** @typedef {Map<import("../../../../src/util/mod.js").UuidString, StudioConnection>} ActiveStudioDataList */

/** @typedef {"disconnected" | "connecting" | "connected"} DiscoveryServerStatusType */

/**
 * @typedef {object} AvailableConnectionConfig
 * @property {import("../../../../src/util/mod.js").UuidString} uuid
 * @property {MessageHandlerType} messageHandlerType
 */

export class StudioConnectionsManager {
	/** @typedef {(status: DiscoveryServerStatusType) => void} OnDiscoveryServerStatusChangeCallback */
	/** @typedef {(activeConnections: ActiveStudioDataList) => void} OnActiveConnectionsChangedCallback */
	constructor() {
		/** @type {string?} */
		this.currentEndpoint = null;
		this.discoveryWs = null;
		/** @type {DiscoveryServerStatusType} */
		this.discoveryServerStatus = "disconnected";
		/** @private @type {Set<OnDiscoveryServerStatusChangeCallback>} */
		this.onDiscoveryServerStatusChangeCbs = new Set();
		/** @private @type {Set<(success: boolean) => void>} */
		this.onDiscoveryOpenOrErrorCbs = new Set();

		/** @type {RemoteStudioMetaData?} */
		this.currentProjectMetaData = null;
		/** @type {RemoteStudioMetaData?} */
		this.lastInternalProjectMetaData = null;
		/** @type {RemoteStudioMetaData?} */
		this.lastWebRtcProjectMetaData = null;

		this.protocol = new ProtocolManager();

		/**
		 * List of available studio instances that are visible via a discovery service
		 * but the studio instances are not necessarily connected yet.
		 * @type {AvailableStudioDataList}
		 */
		this.availableConnections = new Map();
		/** @private @type {Set<() => void>} */
		this.onAvailableConnectionsChangedCbs = new Set();

		/**
		 * The list of connections the client is currently connected to.
		 * @type {ActiveStudioDataList}
		 */
		this.activeConnections = new Map();
		/** @type {Set<OnActiveConnectionsChangedCallback>} */
		this.onActiveConnectionsChangedCbs = new Set();

		this.internalDiscovery = new InternalDiscoveryManager({
			fallbackDiscoveryUrl: new URL("internalDiscovery", window.location.href).href,
		});
		this.internalDiscovery.onConnectionCreated((otherClientId, messagePort, connectionData) => {
			const allowed = this.#verifyInternalConnectionAllowed(otherClientId, connectionData);
			if (!allowed) {
				messagePort.close();
			} else {
				let connection = this.activeConnections.get(otherClientId);
				if (!connection) {
					const messageHandler = new MessageHandlerInternal(otherClientId, this);
					connection = this.addActiveConnection(otherClientId, messageHandler);
				}
				const handler = /** @type {MessageHandlerInternal} */ (connection.messageHandler);
				handler.assignMessagePort(messagePort);
			}
		});
		this.internalDiscovery.onAvailableClientUpdated(e => {
			if (e.deleted) {
				this.availableConnections.delete(e.clientId);
			} else {
				let availableClient = this.availableConnections.get(e.clientId);
				if (!availableClient) {
					if (!e.clientType) {
						throw new Error("Assertion failed, an available client without a clientType was created");
					}
					availableClient = {
						id: e.clientId,
						messageHandlerType: "internal",
						clientType: e.clientType,
						projectMetaData: e.projectMetaData || null,
					};
					this.availableConnections.set(e.clientId, availableClient);
				} else {
					if (e.clientType) {
						availableClient.clientType = e.clientType;
					}
					if (e.projectMetaData !== undefined) {
						availableClient.projectMetaData = e.projectMetaData;
					}
				}
			}

			this.fireAvailableConnectionsChanged();
		});
		this.internalDiscovery.registerClient("studio");

		/**
		 * When the user opens a recent project that is a remote project,
		 * this is set to the config needed to connect to the remote project
		 * once it becomes available. Every time the available connections
		 * list changes, this is checked. If the list contains a connection
		 * that matches this config, the connection is made.
		 * @type {AvailableConnectionConfig?}
		 */
		this.waitingForAvailableConnection = null;
		this.onAvailableConnectionsChanged(() => {
			if (!this.waitingForAvailableConnection) return;
			const connection = this.findConnectionByAvailableConnectionConfig(this.waitingForAvailableConnection);
			if (connection) {
				this.startConnection(connection.id);
			}
		});

		window.addEventListener("unload", () => {
			this.destructor();
		});
	}

	destructor() {
		this.setDiscoveryEndpoint(null);
		this.internalDiscovery.destructor();
	}

	/**
	 * Returns the client id of this studio instance.
	 * Other applications can use this id if they wish to connect to this studio instance.
	 */
	getInternalDiscoveryClientId() {
		return this.internalDiscovery.getClientId();
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

	/**
	 * @param {string} otherClientId
	 * @param {import("../../../../src/inspector/InternalDiscoveryManager.js").InternalDiscoveryRequestConnectionData} connectionData
	 */
	#verifyInternalConnectionAllowed(otherClientId, connectionData) {
		const clientData = this.availableConnections.get(otherClientId);
		if (!clientData) {
			throw new Error("Assertion failed, a connection was attempted to be made with a connection not in the available clients list.");
		}

		if (this.#allowInternalIncoming) {
			// TODO: Add an allowlist #751
			return true;
		}

		if (connectionData.token && this.#internalConnectionTokens.has(connectionData.token)) return true;

		return false;
	}

	/**
	 * @param {import("../../../../src/util/mod.js").UuidString} otherClientId
	 */
	requestInternalMessageChannelConnection(otherClientId) {
		this.internalDiscovery.requestConnection(otherClientId);
	}

	getDefaultEndPoint() {
		if (window.location.hostname == "renda.studio" || window.location.hostname.endsWith(".renda.studio")) {
			return "discovery.renda.studio";
		} else {
			const protocol = window.location.protocol == "https:" ? "wss" : "ws";
			return `${protocol}://${window.location.host}/studioDiscovery`;
		}
	}

	/**
	 * @param {DiscoveryServerStatusType} status
	 */
	setDiscoveryServerStatus(status) {
		this.discoveryServerStatus = status;
		this.onDiscoveryServerStatusChangeCbs.forEach(cb => cb(status));
	}

	/**
	 * @param {OnDiscoveryServerStatusChangeCallback} cb
	 */
	onDiscoveryServerStatusChange(cb) {
		this.onDiscoveryServerStatusChangeCbs.add(cb);
	}

	/**
	 * @param {OnDiscoveryServerStatusChangeCallback} cb
	 */
	removeOnDiscoveryServerStatusChange(cb) {
		this.onDiscoveryServerStatusChangeCbs.delete(cb);
	}

	/**
	 * Notifies any discovery services about the current metadata of a project.
	 * This is to make it possible for other clients to render the name etc.
	 * before the actual connection is being made.
	 * @param {RemoteStudioMetaData} metaData
	 */
	setProjectMetaData(metaData) {
		this.currentProjectMetaData = metaData;
		this.#updateProjectMetaData();
	}

	/**
	 * @param {RemoteStudioMetaData?} oldData
	 * @param {RemoteStudioMetaData?} newData
	 */
	#metaDataChanged(oldData, newData) {
		if (oldData == newData) return false;
		if (
			newData && oldData &&
			oldData.name == newData.name &&
			oldData.uuid == newData.uuid &&
			oldData.fileSystemHasWritePermissions == newData.fileSystemHasWritePermissions
		) return false;

		return true;
	}

	/**
	 * Sends the current state of project metadata to remote and internal studio connections.
	 */
	#updateProjectMetaData() {
		if (this.#metaDataChanged(this.currentProjectMetaData, this.lastWebRtcProjectMetaData)) {
			this.lastWebRtcProjectMetaData = this.currentProjectMetaData;
			this.send({
				op: "projectMetaData",
				projectMetaData: this.currentProjectMetaData,
			});
		}

		const internalMetaData = this.#allowInternalIncoming ? this.currentProjectMetaData : null;
		if (this.#metaDataChanged(internalMetaData, this.lastInternalProjectMetaData)) {
			this.lastInternalProjectMetaData = internalMetaData;
			this.internalDiscovery.sendProjectMetaData(internalMetaData);
		}
	}

	#allowInternalIncoming = false;

	/**
	 * @param {boolean} allowInternalIncoming
	 */
	setAllowInternalIncoming(allowInternalIncoming) {
		this.#allowInternalIncoming = allowInternalIncoming;
		this.#updateProjectMetaData();
	}

	/**
	 * @param {string?} endpoint
	 */
	setDiscoveryEndpoint(endpoint) {
		if (endpoint == this.currentEndpoint) return;
		this.currentEndpoint = endpoint;

		if (this.discoveryWs) {
			this.discoveryWs.close();
			this.discoveryWs = null;
		}
		if (endpoint) {
			this.setDiscoveryServerStatus("connecting");
			const ws = new WebSocket(endpoint);
			this.discoveryWs = ws;
			this.discoveryWs.addEventListener("open", () => {
				if (ws != this.discoveryWs) return;

				this.setDiscoveryServerStatus("connected");
				this.fireOpenOrError(true);
				this.lastWebRtcProjectMetaData = null;
				this.#updateProjectMetaData();
			});

			this.discoveryWs.addEventListener("message", e => {
				if (ws != this.discoveryWs) return;

				if (!e.data) return;
				const data = JSON.parse(e.data);
				const {op} = data;

				if (op == "nearbyHostConnectionsList") {
					const {connections} = data;
					for (const [id, connection] of this.availableConnections) {
						if (connection.messageHandlerType == "webRtc") {
							this.availableConnections.delete(id);
						}
					}
					for (const connection of connections) {
						this.addAvailableWebRtcConnection(connection, false);
					}
					this.fireAvailableConnectionsChanged();
				} else if (op == "nearbyHostConnectionAdded") {
					const {connection} = data;
					this.addAvailableWebRtcConnection(connection);
				} else if (op == "nearbyHostConnectionRemoved") {
					const {id} = data;
					this.availableConnections.delete(id);
					this.fireAvailableConnectionsChanged();
				} else if (op == "nearbyHostConnectionUpdateProjectMetaData") {
					const {id, projectMetaData} = data;
					const connection = this.availableConnections.get(id);
					if (connection) {
						connection.projectMetaData = projectMetaData;
						this.fireAvailableConnectionsChanged();
					}
				} else if (op == "relayMessage") {
					const {fromUuid, data: relayData} = data;
					const {op: relayOp} = relayData;
					if (relayOp == "rtcOffer") {
						const {rtcDescription} = relayData;
						this.handleRtcOffer(fromUuid, rtcDescription);
					} else if (relayOp == "rtcIceCandidate") {
						const {iceCandidate} = relayData;
						this.handleRtcIceCandidate(fromUuid, iceCandidate);
					}
				}
			});

			this.discoveryWs.addEventListener("close", () => {
				this.setDiscoveryServerStatus("disconnected");
				this.availableConnections.clear();
				this.fireAvailableConnectionsChanged();
			});
		}
	}

	/**
	 * @typedef {object} AvailableRtcConnectionData
	 * @property {import("../../../../src/util/mod.js").UuidString} id
	 * @property {ClientType} clientType
	 * @property {RemoteStudioMetaData?} projectMetaData
	 */

	/**
	 * @param {AvailableRtcConnectionData} connection
	 * @param {boolean} fireAvailableConnectionsChanged
	 */
	addAvailableWebRtcConnection(connection, fireAvailableConnectionsChanged = true) {
		this.availableConnections.set(connection.id, {
			id: connection.id,
			messageHandlerType: "webRtc",
			clientType: connection.clientType,
			projectMetaData: connection.projectMetaData,
		});
		if (fireAvailableConnectionsChanged) this.fireAvailableConnectionsChanged();
	}

	/**
	 * @returns {Promise<boolean>} Whether the connection was opened.
	 */
	async waitForDiscoveryOpenOrError() {
		if (this.discoveryWs && this.discoveryWs.readyState == WebSocket.OPEN) return true;
		return await new Promise(r => this.onDiscoveryOpenOrErrorCbs.add(r));
	}

	/**
	 * @param {boolean} success
	 */
	fireOpenOrError(success) {
		this.onDiscoveryOpenOrErrorCbs.forEach(cb => cb(success));
		this.onDiscoveryOpenOrErrorCbs.clear();
	}

	/**
	 * @param {unknown} data
	 */
	async send(data) {
		const open = await this.waitForDiscoveryOpenOrError();
		if (!open) return;

		if (this.discoveryWs) {
			this.discoveryWs.send(JSON.stringify(data));
		}
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

	fireAvailableConnectionsChanged() {
		this.onAvailableConnectionsChangedCbs.forEach(cb => cb());
	}

	/**
	 * Fires when the list of active connections changes.
	 * A connection is considered active when messages can be sent. I.e.
	 * available connections from a discovery service are not listed here
	 * unless they are also connected.
	 * @param {OnActiveConnectionsChangedCallback} cb
	 */
	onActiveConnectionsChanged(cb) {
		this.onActiveConnectionsChangedCbs.add(cb);
	}

	/**
	 * @param {OnActiveConnectionsChangedCallback} cb
	 */
	removeOnActiveConnectionsChanged(cb) {
		this.onActiveConnectionsChangedCbs.delete(cb);
	}

	fireActiveConnectionsChanged() {
		this.onActiveConnectionsChangedCbs.forEach(cb => cb(this.activeConnections));
	}

	/**
	 * Waits for a connection to any discovery services and once a connection is
	 * available in the list of available connection matches this config, a
	 * connection is made to that available connection.
	 * @param {AvailableConnectionConfig} config
	 */
	waitForAvailableAndConnect(config) {
		const existingConnection = this.findConnectionByAvailableConnectionConfig(config);
		if (existingConnection) {
			this.startConnection(existingConnection.id);
		} else {
			this.waitingForAvailableConnection = config;
		}
	}

	/**
	 * @param {AvailableConnectionConfig} config
	 */
	findConnectionByAvailableConnectionConfig(config) {
		if (!config) return null;
		for (const connection of this.availableConnections.values()) {
			if (
				connection.projectMetaData?.uuid == config.uuid &&
				connection.messageHandlerType == config.messageHandlerType
			) {
				return connection;
			}
		}
		return null;
	}

	/**
	 * @param {import("../../../../src/util/mod.js").UuidString} connectionId
	 */
	startConnection(connectionId) {
		const connectionData = this.availableConnections.get(connectionId);
		if (!connectionData) return;

		let messageHandler = null;
		if (connectionData.messageHandlerType == "internal") {
			messageHandler = new MessageHandlerInternal(connectionId, this, true);
		} else if (connectionData.messageHandlerType == "webRtc") {
			messageHandler = new MessageHandlerWebRtc(connectionId, this, true);
		}

		if (messageHandler) {
			this.addActiveConnection(connectionId, messageHandler);
		}
	}

	/**
	 * @param {import("../../../../src/util/mod.js").UuidString} connectionId
	 * @param {import("./messageHandlers/MessageHandler.js").MessageHandler} messageHandler
	 * @return {StudioConnection}
	 */
	addActiveConnection(connectionId, messageHandler) {
		const studioConnection = new StudioConnection(messageHandler, this.protocol);
		studioConnection.onConnectionStateChange(newState => {
			this.fireActiveConnectionsChanged();
		});
		this.activeConnections.set(connectionId, studioConnection);
		this.fireActiveConnectionsChanged();
		return studioConnection;
	}

	/**
	 * @param {import("../../../../src/util/mod.js").UuidString} studioId
	 * @param {RTCSessionDescriptionInit} rtcDescription
	 */
	handleRtcOffer(studioId, rtcDescription) {
		let studioConnection = this.activeConnections.get(studioId);
		if (!studioConnection) {
			const messageHandler = new MessageHandlerWebRtc(studioId, this);
			studioConnection = this.addActiveConnection(studioId, messageHandler);
		}
		const handler = /** @type {MessageHandlerWebRtc} */ (studioConnection.messageHandler);
		handler.handleRtcOffer(rtcDescription);
	}

	/**
	 * @param {import("../../../../src/util/mod.js").UuidString} studioId
	 * @param {RTCIceCandidateInit} iceCandidate
	 */
	handleRtcIceCandidate(studioId, iceCandidate) {
		const studioConnection = this.activeConnections.get(studioId);
		if (!studioConnection) return;

		const handler = /** @type {MessageHandlerWebRtc} */ (studioConnection.messageHandler);
		handler.handleRtcIceCandidate(iceCandidate);
	}

	/**
	 * Let the discovery server know whether this client has a project available that others can connect to.
	 * When set to true there is a project availble, when set to false then we're looking to connect to another project.
	 * @param {boolean} isHost
	 */
	sendSetIsStudioHost(isHost) {
		this.send({
			op: "setIsStudioHost",
			isHost,
		});
	}

	/**
	 * @param {import("../../../../src/util/mod.js").UuidString} toUuid
	 * @param {*} data
	 */
	sendRelayData(toUuid, data) {
		this.send({
			op: "relayMessage",
			toUuid, data,
		});
	}

	/**
	 * @param {import("../../../../src/util/mod.js").UuidString} toUuid
	 * @param {RTCSessionDescriptionInit} rtcDescription
	 */
	sendRtcOffer(toUuid, rtcDescription) {
		this.sendRelayData(toUuid, {
			op: "rtcOffer",
			rtcDescription,
		});
	}

	/**
	 * @param {import("../../../../src/util/mod.js").UuidString} toUuid
	 * @param {RTCIceCandidate} iceCandidate
	 */
	sendRtcIceCandidate(toUuid, iceCandidate) {
		this.sendRelayData(toUuid, {
			op: "rtcIceCandidate",
			iceCandidate,
		});
	}
}
