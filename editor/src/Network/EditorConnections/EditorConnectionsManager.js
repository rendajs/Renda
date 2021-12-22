import {EditorConnection} from "./EditorConnection.js";
import {MessageHandlerWebRtc} from "./MessageHandlers/MessageHandlerWebRtc.js";
import {MessageHandlerInternal} from "./MessageHandlers/MessageHandlerInternal.js";
import {ProtocolManager} from "./ProtocolManager.js";
import {InternalDiscoveryManager} from "../../../../src/mod.js";

/**
 * @typedef {Object} RemoteEditorMetaData
 * @property {string} name
 * @property {import("../../../../src/util/mod.js").UuidString} uuid
 */
/** @typedef {"webRtc" | "internal"} MessageHandlerType */
/** @typedef {"editor" | "inspector"} ClientType */
/**
 * @typedef {Object} AvailableEditorData
 * @property {import("../../../../src/util/mod.js").UuidString} id
 * @property {MessageHandlerType} messageHandlerType
 * @property {ClientType} clientType
 * @property {RemoteEditorMetaData} [projectMetaData]
 */

/** @typedef {Map<import("../../../../src/util/mod.js").UuidString, AvailableEditorData>} AvailableEditorDataList */
/** @typedef {Map<import("../../../../src/util/mod.js").UuidString, EditorConnection>} ActiveEditorDataList */

/** @typedef {"disconnected" | "connecting" | "connected"} DiscoveryServerStatusType */

/**
 * @typedef {Object} AvailableConnectionConfig
 * @property {import("../../../../src/util/mod.js").UuidString} uuid
 * @property {MessageHandlerType} messageHandlerType
 */

export class EditorConnectionsManager {
	constructor() {
		this.currentEndpoint = null;
		this.discoveryWs = null;
		/** @type {DiscoveryServerStatusType} */
		this.discoveryServerStatus = "disconnected";
		/** @type {Set<function(DiscoveryServerStatusType):void>} */
		this.onDiscoveryServerStatusChangeCbs = new Set();
		this.onDiscoveryOpenOrErrorCbs = new Set();

		this.protocol = new ProtocolManager();

		/** @type {AvailableEditorDataList} */
		this.availableConnections = new Map();
		/** @type {Set<function() : void>} */
		this.onAvailableConnectionsChangedCbs = new Set();

		/** @type {ActiveEditorDataList} */
		this.activeConnections = new Map();
		/** @type {Set<function(ActiveEditorDataList) : void>} */
		this.onActiveConnectionsChangedCbs = new Set();

		this.internalDiscovery = new InternalDiscoveryManager();
		this.internalDiscovery.onMessage(data => {
			const {op} = data;
			if (op == "availableClientAdded") {
				const {clientId, clientType, projectMetaData} = data;
				this.availableConnections.set(clientId, {
					id: clientId,
					messageHandlerType: "internal",
					clientType, projectMetaData,
				});
				this.fireAvailableConnectionsChanged();
			} else if (op == "availableClientRemoved") {
				const {clientId} = data;
				this.availableConnections.delete(clientId);
				this.fireAvailableConnectionsChanged();
			} else if (op == "projectMetaData") {
				const {clientId, projectMetaData} = data;
				const connection = this.availableConnections.get(clientId);
				if (connection) {
					connection.projectMetaData = projectMetaData;
					this.fireAvailableConnectionsChanged();
				}
			} else if (op == "connectionCreated") {
				const {clientId, port} = data;
				this.handleInternalConnectionCreation(clientId, port);
			}
		});
		this.internalDiscovery.postMessage({op: "registerClient", clientType: "editor"});

		/** @type {?AvailableConnectionConfig} */
		this.waitingForAvailableConnection = null;
		this.onAvailableConnectionsChanged(() => {
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
		this.internalDiscovery.postMessage({op: "unregisterClient"});
		this.internalDiscovery.destructor();
	}

	/**
	 * @param {import("../../../../src/util/mod.js").UuidString} otherClientId
	 */
	requestInternalMessageChannelConnection(otherClientId) {
		this.internalDiscovery.postMessage({op: "requestConnection", otherClientId});
	}

	/**
	 * @param {RemoteEditorMetaData} projectMetaData
	 */
	sendInternalMessageChannelProjectMetaData(projectMetaData) {
		this.internalDiscovery.postMessage({op: "projectMetaData", projectMetaData});
	}

	static getDefaultEndPoint() {
		return `ws://${window.location.hostname}:8082`;
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
	 * @param {RemoteEditorMetaData} metaData
	 */
	setProjectMetaData(metaData) {
		// todo: only change when it changed
		this.sendProjectMetaData(metaData);
		this.sendInternalMessageChannelProjectMetaData(metaData);
	}

	/**
	 * @param {string} endpoint
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
			});
		}
	}

	/**
	 * @typedef {Object} AvailableRtcConnectionData
	 * @property {import("../../../../src/util/mod.js").UuidString} id
	 * @property {ClientType} clientType
	 * @property {RemoteEditorMetaData} [projectMetaData]
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
	 * @param {import("./MessageHandlers/MessageHandler.js").MessageHandler} messageHandler
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
	 *
	 * @param {import("../../../../src/util/mod.js").UuidString} clientId
	 * @param {MessagePort} messagePort
	 */
	handleInternalConnectionCreation(clientId, messagePort) {
		let connection = this.activeConnections.get(clientId);
		if (!connection) {
			const messageHandler = new MessageHandlerInternal(clientId, this);
			connection = this.addActiveConnection(clientId, messageHandler);
		}
		const handler = /** @type {MessageHandlerInternal} */ (connection.messageHandler);
		handler.assignMessagePort(messagePort);
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
	 * @param {RemoteEditorMetaData} projectMetaData
	 */
	sendProjectMetaData(projectMetaData) {
		this.send({
			op: "projectMetaData",
			projectMetaData,
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
