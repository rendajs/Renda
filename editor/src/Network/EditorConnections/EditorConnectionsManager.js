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
		this.ws = null;
		/** @type {DiscoveryServerStatusType} */
		this.discoveryServerStatus = "disconnected";
		/** @type {Set<function(DiscoveryServerStatusType):void>} */
		this.onDiscoveryServerStatusChangeCbs = new Set();

		/** @type {AvailableEditorDataList} */
		this.availableEditorsList = new Map();

		/** @type {Map<import("../../Util/Util.js").UuidString, EditorConnection>} */
		this.editorConnections = new Map();

		this.onOpenOrErrorCbs = new Set();
		/** @type {Set<function(AvailableEditorDataList) : void>} */
		this.onAvailableEditorsChangedCbs = new Set();
	}

	destructor() {
		this.setEndpoint(null);
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
	setEndpoint(endpoint) {
		if (endpoint == this.currentEndpoint) return;
		this.currentEndpoint = endpoint;

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		if (endpoint) {
			this.setDiscoveryServerStatus("connecting");
			const ws = new WebSocket(endpoint);
			this.ws = ws;
			this.ws.addEventListener("open", () => {
				if (ws != this.ws) return;

				this.setDiscoveryServerStatus("connected");
				this.fireOpenOrError(true);
			});

			this.ws.addEventListener("message", e => {
				if (ws != this.ws) return;

				if (!e.data) return;
				const data = JSON.parse(e.data);
				const {op} = data;

				if (op == "nearbyEditorsList") {
					const {editors} = data;
					this.availableEditorsList.clear();
					for (const editor of editors) {
						this.availableEditorsList.set(editor.id, editor);
					}
					this.fireAvailableEditorsChanged();
				} else if (op == "nearbyEditorAdded") {
					const {editor} = data;
					this.availableEditorsList.set(editor.id, editor);
					this.fireAvailableEditorsChanged();
				} else if (op == "nearbyEditorRemoved") {
					const {id} = data;
					this.availableEditorsList.delete(id);
					this.fireAvailableEditorsChanged();
				} else if (op == "relayMessage") {
					const {fromUuid, data: relayData} = data;
					const {op: relayOp} = relayData;
					if (relayOp == "rtcOffer") {
						const {rtcDescription} = relayData;
						this.handleRtcOffer(fromUuid, rtcDescription);
					}
				}
			});

			this.ws.addEventListener("close", () => {
				this.setDiscoveryServerStatus("disconnected");
			});
		}
	}

	/**
	 * @returns {Promise<boolean>} Whether the connection was opened
	 */
	async waitForOpenOrError() {
		if (this.ws && this.ws.readyState == WebSocket.OPEN) return true;
		return await new Promise(r => this.onOpenOrErrorCbs.add(r));
	}

	/**
	 * @param {boolean} success
	 */
	fireOpenOrError(success) {
		this.onOpenOrErrorCbs.forEach(cb => cb(success));
		this.onOpenOrErrorCbs.clear();
	}

	async send(data) {
		const open = await this.waitForOpenOrError();
		if (!open) return;

		if (this.ws) {
			this.ws.send(JSON.stringify(data));
		}
	}

	/**
	 * @param {function(AvailableEditorDataList) : void} cb
	 */
	onAvailableEditorsChanged(cb) {
		this.onAvailableEditorsChangedCbs.add(cb);
	}

	fireAvailableEditorsChanged() {
		this.onAvailableEditorsChangedCbs.forEach(cb => cb(this.availableEditorsList));
	}

	/**
	 * @param {import("../../Util/Util.js").UuidString} editorId
	 */
	startConnectionToEditor(editorId) {
		if (this.editorConnections.size > 0) {
			throw new Error("Already connected to an editor");
		}
		const messageHandler = new MessageHandlerWebRtc(editorId, this, true);
		const editorConnection = new EditorConnection(messageHandler);
		this.editorConnections.set(editorId, editorConnection);
	}

	/**
	 * @param {import("../../Util/Util.js").UuidString} editorId
	 * @param {RTCSessionDescriptionInit} rtcDescription
	 */
	handleRtcOffer(editorId, rtcDescription) {
		let editorConnection = this.editorConnections.get(editorId);
		if (!editorConnection) {
			const messageHandler = new MessageHandlerWebRtc(editorId, this);
			editorConnection = new EditorConnection(messageHandler);
			this.editorConnections.set(editorId, editorConnection);
		}
		const handler = /** @type {MessageHandlerWebRtc} */ (editorConnection.messageHandler);
		handler.handleRtcOffer(rtcDescription);
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
	 * @param {RTCSessionDescriptionInit} rtcDescription
	 */
	sendRtcOffer(toUuid, rtcDescription) {
		this.sendRelayData(toUuid, {
			op: "rtcOffer",
			rtcDescription,
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
}
