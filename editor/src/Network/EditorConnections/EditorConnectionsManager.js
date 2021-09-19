import EditorConnection from "./EditorConnection.js";
import MessageHandlerWebRtc from "./MessageHandlers/MessageHandlerWebRtc.js";

/**
 * @typedef {Object} AvailableEditorData
 * @property {string} id
 */

/**
 * @typedef {Map<string, AvailableEditorData>} AvailableEditorDataList
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
		this.availableRtcConnections = new Map();
		/** @type {Set<function(AvailableEditorDataList) : void>} */
		this.onAvailableRtcConnectionsChangedCbs = new Set();

		/** @type {Map<import("../../Util/Util.js").UuidString, EditorConnection>} */
		this.activeConnections = new Map();

		this.availableBroadcastConnections = new Set();
		this.broadcastChannel = new BroadcastChannel("editor-discovery");
		this.broadcastChannel.addEventListener("message", e => {
			if (!e.data) return;

			const {op} = e.data;
			if (op == "inspectorManagerInfo") {
				const {uuid} = e.data;
				this.availableBroadcastConnections.add(uuid);
			} else if (op == "inspectorManagerDisconnect") {
				const {uuid} = e.data;
				this.availableBroadcastConnections.delete(uuid);
			}
		});
		this.requestAvailableBroadcastConnections();
	}

	destructor() {
		this.setDiscoveryEndpoint(null);
		this.broadcastChannel.close();
	}

	requestAvailableBroadcastConnections() {
		this.broadcastChannel.postMessage({
			op: "requestInspectorManagerInfo",
		});
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

				if (op == "nearbyEditorsList") {
					const {editors} = data;
					this.availableRtcConnections.clear();
					for (const editor of editors) {
						this.availableRtcConnections.set(editor.id, editor);
					}
					this.fireAvailableRtcConnectionsChanged();
				} else if (op == "nearbyEditorAdded") {
					const {editor} = data;
					this.availableRtcConnections.set(editor.id, editor);
					this.fireAvailableRtcConnectionsChanged();
				} else if (op == "nearbyEditorRemoved") {
					const {id} = data;
					this.availableRtcConnections.delete(id);
					this.fireAvailableRtcConnectionsChanged();
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
	 * @param {function(AvailableEditorDataList) : void} cb
	 */
	onAvailableRtcConnectionsChanged(cb) {
		this.onAvailableRtcConnectionsChangedCbs.add(cb);
	}

	fireAvailableRtcConnectionsChanged() {
		this.onAvailableRtcConnectionsChangedCbs.forEach(cb => cb(this.availableRtcConnections));
	}

	/**
	 * @param {import("../../Util/Util.js").UuidString} editorId
	 */
	startRtcConnection(editorId) {
		if (this.activeConnections.size > 0) {
			throw new Error("Already connected to an editor");
		}
		const messageHandler = new MessageHandlerWebRtc(editorId, this, true);
		const editorConnection = new EditorConnection(messageHandler);
		this.activeConnections.set(editorId, editorConnection);
	}

	/**
	 * @param {import("../../Util/Util.js").UuidString} editorId
	 * @param {RTCSessionDescriptionInit} rtcDescription
	 */
	handleRtcOffer(editorId, rtcDescription) {
		let editorConnection = this.activeConnections.get(editorId);
		if (!editorConnection) {
			const messageHandler = new MessageHandlerWebRtc(editorId, this);
			editorConnection = new EditorConnection(messageHandler);
			this.activeConnections.set(editorId, editorConnection);
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
