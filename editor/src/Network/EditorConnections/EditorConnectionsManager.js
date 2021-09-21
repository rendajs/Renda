import EditorConnection from "./EditorConnection.js";
import MessageHandlerWebRtc from "./MessageHandlers/MessageHandlerWebRtc.js";
import MessageHandlerInternal from "./MessageHandlers/MessageHandlerInternal.js";

/**
 * @typedef {"editor" | "inspector"} ClientType
 */
/**
 * @typedef {Object} AvailableEditorData
 * @property {import("../../Util/Util.js").UuidString} id
 * @property {"webRtc" | "internal"} messageHandlerType
 * @property {ClientType} clientType
 */

/**
 * @typedef {Map<import("../../Util/Util.js").UuidString, AvailableEditorData>} AvailableEditorDataList
 */
/**
 * @typedef {Map<import("../../Util/Util.js").UuidString, EditorConnection>} ActiveEditorDataList
 */

/**
 * @typedef {"disconnected" | "connecting" | "connected"} DiscoveryServerStatusType
 */

export default class EditorConnectionsManager {
	constructor() {
		this.currentEndpoint = null;
		this.discoveryWs = null;
		/** @type {DiscoveryServerStatusType} */
		this.discoveryServerStatus = "disconnected";
		/** @type {Set<function(DiscoveryServerStatusType):void>} */
		this.onDiscoveryServerStatusChangeCbs = new Set();
		this.onDiscoveryOpenOrErrorCbs = new Set();

		/** @type {AvailableEditorDataList} */
		this.availableConnections = new Map();
		/** @type {Set<function() : void>} */
		this.onAvailableConnectionsChangedCbs = new Set();

		/** @type {ActiveEditorDataList} */
		this.activeConnections = new Map();
		/** @type {Set<function(ActiveEditorDataList) : void>} */
		this.onActiveConnectionsChangedCbs = new Set();

		this.internalMessagesWorker = new SharedWorker("../../../../src/Inspector/InternalDiscoveryWorker.js", {type: "module"});
		this.internalMessagesWorker.port.addEventListener("message", e => {
			if (!e.data) return;

			const {op} = e.data;
			if (op == "availableClientAdded") {
				const {clientId, clientType} = e.data;
				this.availableConnections.set(clientId, {
					id: clientId,
					messageHandlerType: "internal",
					clientType,
				});
				this.fireAvailableConnectionsChanged();
			} else if (op == "availableClientRemoved") {
				const {clientId} = e.data;
				this.availableConnections.delete(clientId);
				this.fireAvailableConnectionsChanged();
			} else if (op == "connectionCreated") {
				const {clientId, port} = e.data;
				this.handleInternalConnectionCreation(clientId, port);
			}
		});
		this.internalMessagesWorker.port.start();
		this.internalMessagesWorker.port.postMessage({op: "registerClient", clientType: "editor"});

		window.addEventListener("unload", () => {
			this.destructor();
		});
	}

	destructor() {
		this.setDiscoveryEndpoint(null);
		this.internalMessagesWorker.port.postMessage({op: "unregisterClient"});
		this.internalMessagesWorker.port.close();
	}

	/**
	 * @param {import("../../Util/Util.js").UuidString} otherClientId
	 */
	requestInternalMessageChannelConnection(otherClientId) {
		this.internalMessagesWorker.port.postMessage({op: "requestConnection", otherClientId});
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
	 * @param {{id: import("../../Util/Util.js").UuidString, clientType: ClientType}} connection
	 * @param {boolean} [fireAvailableConnectionsChanged = true]
	 */
	addAvailableWebRtcConnection(connection, fireAvailableConnectionsChanged = true) {
		this.availableConnections.set(connection.id, {
			id: connection.id,
			messageHandlerType: "webRtc",
			clientType: connection.clientType,
		});
		if (fireAvailableConnectionsChanged) this.fireAvailableConnectionsChanged();
	}

	/**
	 * @returns {Promise<boolean>} Whether the connection was opened
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
	 * @param {import("../../Util/Util.js").UuidString} connectionId
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
	 * @param {import("../../Util/Util.js").UuidString} connectionId
	 * @param {import("./MessageHandlers/MessageHandler.js").default} messageHandler
	 * @return {EditorConnection}
	 */
	addActiveConnection(connectionId, messageHandler) {
		const editorConnection = new EditorConnection(messageHandler);
		editorConnection.onConnectionStateChange(newState => {
			this.fireActiveConnectionsChanged();
		});
		this.activeConnections.set(connectionId, editorConnection);
		this.fireActiveConnectionsChanged();
		return editorConnection;
	}

	/**
	 *
	 * @param {import("../../Util/Util.js").UuidString} clientId
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
	 * @param {import("../../Util/Util.js").UuidString} editorId
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
	 * @param {import("../../Util/Util.js").UuidString} editorId
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
	sendSetIsHost(isHost) {
		this.send({
			op: "setIsHost",
			isHost,
		});
	}

	/**
	 * @param {import("../../Util/Util.js").UuidString} toUuid
	 * @param {*} data
	 */
	sendRelayData(toUuid, data) {
		this.send({
			op: "relayMessage",
			toUuid, data,
		});
	}

	/**
	 * @param {import("../../Util/Util.js").UuidString} toUuid
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
	 * @param {import("../../Util/Util.js").UuidString} toUuid
	 * @param {RTCIceCandidate} iceCandidate
	 */
	sendRtcIceCandidate(toUuid, iceCandidate) {
		this.sendRelayData(toUuid, {
			op: "rtcIceCandidate",
			iceCandidate,
		});
	}
}
