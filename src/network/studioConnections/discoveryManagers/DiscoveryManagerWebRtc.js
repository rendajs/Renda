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

/**
 * This class allows you to discover other tabs via a central discovery server.
 * When created, a connection to a WebSocket is made, which can be used for connecting to another client via WebRTC.
 * @extends {DiscoveryManager<MessageHandlerWebRtc>}
 */
export class DiscoveryManagerWebRtc extends DiscoveryManager {
	/** @typedef {(status: DiscoveryServerStatusType) => void} OnStatusChangeCallback */

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
		/** @private @type {Set<OnStatusChangeCallback>} */
		this.onStatusChangeCbs = new Set();

		/** @private @type {import("./DiscoveryManager.js").RemoteStudioMetaData?} */
		this.lastProjectMetaData = null;

		/** @private */
		this.ws = new WebSocket(endpoint);
		this.ws.addEventListener("open", () => {
			this._setStatus("connected");
			this.lastProjectMetaData = null;
		});

		/** @private @type {TypedMessenger<ExternalDiscoveryManagerResponseHandlers, import("/Users/Jesper/repositories/studio-discovery-server/src/WebSocketConnection.js").StudioDescoveryResponseHandlers>} */
		this.messenger = new TypedMessenger();
		this.messenger.initializeWebSocket(this.ws, this.getResponseHandlers());
		this.messenger.configureSendOptions({
			relayMessage: {
				expectResponse: false,
			},
			setIsStudioHost: {
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

		/** @private */
		this.messenger = new TypedMessenger({globalTimeout: 20_000});
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
	 * @param {OnStatusChangeCallback} cb
	 */
	onStatusChange(cb) {
		this.onStatusChangeCbs.add(cb);
	}

	/**
	 * @param {OnStatusChangeCallback} cb
	 */
	removeOnStatusChange(cb) {
		this.onStatusChangeCbs.delete(cb);
	}

	/**
	 * @override
	 * @param {import("./DiscoveryManager.js").RemoteStudioMetaData?} metaData
	 */
	async setProjectMetaData(metaData) {
		const oldData = this.lastProjectMetaData;
		if (!oldData && !this.lastProjectMetaData) return;
		if (
			metaData && oldData &&
			oldData.name == metaData.name &&
			oldData.uuid == metaData.uuid &&
			oldData.fileSystemHasWritePermissions == metaData.fileSystemHasWritePermissions
		) return;
		this.lastProjectMetaData = structuredClone(metaData);

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
