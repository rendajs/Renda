import {TypedMessenger} from "../../../util/TypedMessenger.js";
import {MessageHandlerWebRtc} from "../messageHandlers/MessageHandlerWebRtc.js";
import {DiscoveryManager} from "./DiscoveryManager.js";

/**
 * @fileoverview This DiscoveryManager allows connecting to other clients remotely.
 * Source code of the discovery server can be found at https://github.com/rendajs/studio-discovery-server.
 */

/** @typedef {"disconnected" | "connecting" | "connected"} DiscoveryServerStatusType */

/** @typedef {ReturnType<DiscoveryManagerWebRtc["getResponseHandlers"]>} ExternalDiscoveryManagerResponseHandlers */

/**
 * @typedef ExternalDiscoveryRelayOfferData
 * @property {"rtcDescription"} type
 * @property {RTCSessionDescriptionInit} description
 */
/**
 * @typedef ExternalDiscoveryRelayCandidateData
 * @property {"rtcIceCandidate"} type
 * @property {RTCIceCandidate} candidate
 */
/** @typedef {ExternalDiscoveryRelayOfferData | ExternalDiscoveryRelayCandidateData} ExternalDiscoveryRelayData */

/** @typedef {(status: DiscoveryServerStatusType) => void} OnDiscoveryManagerWebRtcStatusChangeCallback */

/**
 * This class allows you to discover other tabs via a central discovery server.
 * When created, a connection to a WebSocket is made, which can be used for connecting to another client via WebRTC.
 * @extends {DiscoveryManager<MessageHandlerWebRtc>}
 */
export class DiscoveryManagerWebRtc extends DiscoveryManager {
	static type = /** @type {const} */ ("renda:webrtc");

	/**
	 * @param {object} options
	 * @param {string} options.endpoint The url where the WebSocket is hosted.
	 */
	constructor({
		endpoint,
	}) {
		super();

		/** @private @type {DiscoveryServerStatusType} */
		this._status = "connecting";
		/** @private @type {Set<OnDiscoveryManagerWebRtcStatusChangeCallback>} */
		this.onStatusChangeCbs = new Set();

		/** @private */
		this._endpoint = endpoint;

		/** @private */
		this.ws = new WebSocket(endpoint);
		this.ws.addEventListener("open", () => {
			this._setStatus("connected");
		});

		/** @private @type {TypedMessenger<ExternalDiscoveryManagerResponseHandlers, import("/Users/Jesper/repositories/studio-discovery-server/src/WebSocketConnection.js").StudioDescoveryResponseHandlers>} */
		this.messenger = new TypedMessenger({globalTimeout: 20_000});
		this.messenger.initializeWebSocket(this.ws, this.getResponseHandlers());
		this.messenger.configureSendOptions({
			relayMessage: {
				expectResponse: false,
			},
			setClientType: {
				expectResponse: false,
			},
			setProjectMetaData: {
				expectResponse: false,
			},
		});

		this.ws.addEventListener("close", () => {
			this._setStatus("disconnected");
			this.clearAvailableConnections();
		});
	}

	/**
	 * @override
	 */
	destructor() {
		this.ws.close();
	}

	/**
	 * @override
	 * @param {import("../StudioConnectionsManager.js").ClientType} clientType
	 */
	async registerClient(clientType) {
		this.messenger.send.setClientType(clientType);
	}

	get endpoint() {
		return this._endpoint;
	}

	get status() {
		return this._status;
	}

	/**
	 * @private
	 */
	getResponseHandlers() {
		const disableResponseReturn = /** @satisfies {import("../../../mod.js").TypedMessengerRequestHandlerReturn} */ ({
			$respondOptions: {
				respond: false,
			},
		});

		return {
			/**
			 * @param {import("./DiscoveryManager.js").AvailableStudioData[]} connections
			 */
			nearbyHostConnectionsList: connections => {
				this.clearAvailableConnections(false);
				for (const connection of connections) {
					this.addAvailableConnection(connection, false);
				}
				this.fireAvailableConnectionsChanged();
				return disableResponseReturn;
			},
			/**
			 * @param {import("./DiscoveryManager.js").AvailableStudioData} connection
			 */
			nearbyHostConnectionAdded: connection => {
				this.addAvailableConnection(connection);
				return disableResponseReturn;
			},
			/**
			 * @param {import("../../../mod.js").UuidString} id
			 */
			nearbyHostConnectionRemoved: id => {
				this.removeAvailableConnection(id);
				return disableResponseReturn;
			},
			/**
			 * @param {import("../../../mod.js").UuidString} id
			 * @param {import("./DiscoveryManager.js").RemoteStudioMetaData?} projectMetaData
			 */
			nearbyHostConnectionUpdateProjectMetaData: (id, projectMetaData) => {
				this.setConnectionProjectMetaData(id, projectMetaData);
				return disableResponseReturn;
			},
			/**
			 * @param {import("../../../mod.js").UuidString} fromUuid
			 * @param {ExternalDiscoveryRelayData} relayData
			 */
			relayMessage: (fromUuid, relayData) => {
				if (relayData.type == "rtcDescription") {
					this._handleRtcDescription(fromUuid, relayData.description);
				} else if (relayData.type == "rtcIceCandidate") {
					this._handleRtcIceCandidate(fromUuid, relayData.candidate);
				}
			},
		};
	}

	/**
	 * @private
	 * @param {DiscoveryServerStatusType} status
	 */
	_setStatus(status) {
		if (status == this._status) return;
		this._status = status;
		this.onStatusChangeCbs.forEach(cb => cb(status));
	}

	/**
	 * @param {OnDiscoveryManagerWebRtcStatusChangeCallback} cb
	 */
	onStatusChange(cb) {
		this.onStatusChangeCbs.add(cb);
	}

	/**
	 * @param {OnDiscoveryManagerWebRtcStatusChangeCallback} cb
	 */
	removeOnStatusChange(cb) {
		this.onStatusChangeCbs.delete(cb);
	}

	/**
	 * @override
	 * @param {import("./DiscoveryManager.js").RemoteStudioMetaData?} metaData
	 */
	async setProjectMetaData(metaData) {
		await this.messenger.send.setProjectMetaData(metaData);
	}

	/**
	 * @private
	 * @param {import("../../../mod.js").UuidString} connectionId
	 * @param {RTCSessionDescriptionInit} rtcDescription
	 */
	_handleRtcDescription(connectionId, rtcDescription) {
		let studioConnection = this.activeConnections.get(connectionId);
		if (!studioConnection) {
			studioConnection = new MessageHandlerWebRtc(connectionId, {
				sendRtcIceCandidate: (uuid, candidate) => {
					this.messenger.send.relayMessage(uuid, {
						type: "rtcIceCandidate",
						candidate,
					});
				},
				sendRtcDescription: (uuid, description) => {
					this.messenger.send.relayMessage(uuid, {
						type: "rtcDescription",
						description,
					});
				},
			});
			this.addActiveConnection(connectionId, studioConnection);
		}
		studioConnection.handleRtcDescription(rtcDescription);
	}

	/**
	 * @private
	 * @param {import("../../../mod.js").UuidString} studioId
	 * @param {RTCIceCandidateInit} iceCandidate
	 */
	_handleRtcIceCandidate(studioId, iceCandidate) {
		const studioConnection = this.activeConnections.get(studioId);
		if (!studioConnection) return;

		studioConnection.handleRtcIceCandidate(iceCandidate);
	}
}
