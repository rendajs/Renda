import {EditorConnection} from "./EditorConnection.js";
import {MessageHandlerWebRtc} from "./messageHandlers/MessageHandlerWebRtc.js";
import {MessageHandlerInternal} from "./messageHandlers/MessageHandlerInternal.js";
import {ProtocolManager} from "./ProtocolManager.js";
import {InternalDiscoveryManager} from "../../../../src/inspector/InternalDiscoveryManager.js";

/**
 * @typedef {object} RemoteEditorMetaData
 * @property {string} name
 * @property {boolean} fileSystemHasWritePermissions
 * @property {import("../../../../src/util/mod.js").UuidString} uuid
 */
/** @typedef {"webRtc" | "internal"} MessageHandlerType */
/** @typedef {"editor" | "inspector"} ClientType */
/**
 * @typedef {object} AvailableEditorData
 * @property {import("../../../../src/util/mod.js").UuidString} id
 * @property {MessageHandlerType} messageHandlerType
 * @property {ClientType} clientType
 * @property {RemoteEditorMetaData?} projectMetaData
 */

/** @typedef {Map<import("../../../../src/util/mod.js").UuidString, AvailableEditorData>} AvailableEditorDataList */
/** @typedef {Map<import("../../../../src/util/mod.js").UuidString, EditorConnection>} ActiveEditorDataList */

/** @typedef {"disconnected" | "connecting" | "connected"} DiscoveryServerStatusType */

/**
 * @typedef {object} AvailableConnectionConfig
 * @property {import("../../../../src/util/mod.js").UuidString} uuid
 * @property {MessageHandlerType} messageHandlerType
 */

export class EditorConnectionsManager {
	constructor() {
		/** @type {string?} */
		this.currentEndpoint = null;
		this.discoveryWs = null;
		/** @type {DiscoveryServerStatusType} */
		this.discoveryServerStatus = "disconnected";
		/** @private @type {Set<function(DiscoveryServerStatusType):void>} */
		this.onDiscoveryServerStatusChangeCbs = new Set();
		/** @private @type {Set<(success: boolean) => void>} */
		this.onDiscoveryOpenOrErrorCbs = new Set();

		/** @type {RemoteEditorMetaData?} */
		this.currentProjectMetaData = null;
		/** @type {RemoteEditorMetaData?} */
		this.lastInternalProjectMetaData = null;
		/** @type {RemoteEditorMetaData?} */
		this.lastWebRtcProjectMetaData = null;

		this.protocol = new ProtocolManager();

		/**
		 * List of available editors that are visible via a discovery service
		 * but the editors are not necessarily connected yet.
		 * @type {AvailableEditorDataList}
		 */
		this.availableConnections = new Map();
		/** @private @type {Set<function() : void>} */
		this.onAvailableConnectionsChangedCbs = new Set();

		/**
		 * The list of connections the client is currently connected to.
		 * @type {ActiveEditorDataList}
		 */
		this.activeConnections = new Map();
		/** @type {Set<function(ActiveEditorDataList) : void>} */
		this.onActiveConnectionsChangedCbs = new Set();

		this.internalDiscovery = new InternalDiscoveryManager({
			fallbackDiscoveryUrl: new URL("internalDiscovery.html", window.location.href).href,
		});
		this.internalDiscovery.onConnectionCreated((otherClientId, messagePort) => {
			let connection = this.activeConnections.get(otherClientId);
			if (!connection) {
				const messageHandler = new MessageHandlerInternal(otherClientId, this);
				connection = this.addActiveConnection(otherClientId, messageHandler);
			}
			const handler = /** @type {MessageHandlerInternal} */ (connection.messageHandler);
			handler.assignMessagePort(messagePort);
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
		this.internalDiscovery.registerClient("editor");

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
	 * @param {import("../../../../src/util/mod.js").UuidString} otherClientId
	 */
	requestInternalMessageChannelConnection(otherClientId) {
		this.internalDiscovery.requestConnection(otherClientId);
	}

	static getDefaultEndPoint() {
		return `ws://${window.location.host}/editorDiscovery`;
	}

	/**
	 * @param {DiscoveryServerStatusType} status
	 */
	setDiscoveryServerStatus(status) {
		this.discoveryServerStatus = status;
		this.onDiscoveryServerStatusChangeCbs.forEach(cb => cb(status));
	}

	/**
	 * @param {function(DiscoveryServerStatusType):void} cb
	 */
	onDiscoveryServerStatusChange(cb) {
		this.onDiscoveryServerStatusChangeCbs.add(cb);
	}

	/**
	 * @param {function(DiscoveryServerStatusType) : void} cb
	 */
	removeOnDiscoveryServerStatusChange(cb) {
		this.onDiscoveryServerStatusChangeCbs.delete(cb);
	}

	/**
	 * Notifies any discovery services about the current metadata of a project.
	 * This is to make it possible for other clients to render the name etc.
	 * before the actual connection is being made.
	 * @param {RemoteEditorMetaData} metaData
	 */
	setProjectMetaData(metaData) {
		this.currentProjectMetaData = metaData;
		this.#updateProjectMetaData();
	}

	/**
	 * @param {RemoteEditorMetaData?} oldData
	 * @param {RemoteEditorMetaData?} newData
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
	 * Sends the current state of project metadata to remote and internal editor
	 * connections.
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
				} else if (op == "nearbyHostConnectionUpdateMetaData") {
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
	 * @property {RemoteEditorMetaData?} projectMetaData
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
	 * @param {function() : void} cb
	 */
	onAvailableConnectionsChanged(cb) {
		this.onAvailableConnectionsChangedCbs.add(cb);
	}

	/**
	 * @param {function() : void} cb
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
	 * @param {function(ActiveEditorDataList) : void} cb
	 */
	onActiveConnectionsChanged(cb) {
		this.onActiveConnectionsChangedCbs.add(cb);
	}

	/**
	 * @param {function(ActiveEditorDataList) : void} cb
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
	 * @return {EditorConnection}
	 */
	addActiveConnection(connectionId, messageHandler) {
		const editorConnection = new EditorConnection(messageHandler, this.protocol);
		editorConnection.onConnectionStateChange(newState => {
			this.fireActiveConnectionsChanged();
		});
		this.activeConnections.set(connectionId, editorConnection);
		this.fireActiveConnectionsChanged();
		return editorConnection;
	}

	/**
	 * @param {import("../../../../src/util/mod.js").UuidString} editorId
	 * @param {RTCSessionDescriptionInit} rtcDescription
	 */
	handleRtcOffer(editorId, rtcDescription) {
		let editorConnection = this.activeConnections.get(editorId);
		if (!editorConnection) {
			const messageHandler = new MessageHandlerWebRtc(editorId, this);
			editorConnection = this.addActiveConnection(editorId, messageHandler);
		}
		const handler = /** @type {MessageHandlerWebRtc} */ (editorConnection.messageHandler);
		handler.handleRtcOffer(rtcDescription);
	}

	/**
	 * @param {import("../../../../src/util/mod.js").UuidString} editorId
	 * @param {RTCIceCandidateInit} iceCandidate
	 */
	handleRtcIceCandidate(editorId, iceCandidate) {
		const editorConnection = this.activeConnections.get(editorId);
		if (!editorConnection) return;

		const handler = /** @type {MessageHandlerWebRtc} */ (editorConnection.messageHandler);
		handler.handleRtcIceCandidate(iceCandidate);
	}

	/**
	 * @param {boolean} isHost
	 */
	sendSetIsEditorHost(isHost) {
		this.send({
			op: "setIsEditorHost",
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
	 *
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
