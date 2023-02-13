import {MessageHandler} from "./MessageHandler.js";

export class MessageHandlerWebRtc extends MessageHandler {
	/**
	 * @param {import("../../../../../src/util/mod.js").UuidString} otherClientUuid
	 * @param {import("../StudioConnectionsManager.js").StudioConnectionsManager} connectionsManager
	 * @param {boolean} isInitiator
	 */
	constructor(otherClientUuid, connectionsManager, isInitiator = false) {
		super();
		this.otherClientUuid = otherClientUuid;
		this.connectionsManager = connectionsManager;
		this.isInitiator = isInitiator;

		this.rtcConnection = new RTCPeerConnection();
		this.localDescription = null;
		this.remoteDescription = null;
		/** @type {Map<string, RTCDataChannel>} */
		this.dataChannels = new Map();

		this.rtcConnection.addEventListener("icecandidate", e => {
			if (e.candidate) {
				this.connectionsManager.sendRtcIceCandidate(this.otherClientUuid, e.candidate);
			}
		});
		this.rtcConnection.addEventListener("datachannel", e => {
			this.addDataChannelListeners(e.channel);
			this.dataChannels.set(e.channel.label, e.channel);
		});
		this.rtcConnection.addEventListener("connectionstatechange", e => {
			this.updateConnectionState();
		});
		this.rtcConnection.addEventListener("negotiationneeded", e => {
			this.initWebRtcConnection();
		});

		if (this.isInitiator) {
			this.createDataChannel("reliable");
			this.createDataChannel("unreliable", {
				maxRetransmits: 0,
			});
		}
	}

	async initWebRtcConnection() {
		if (!this.isInitiator) return;

		const localDescription = await this.rtcConnection.createOffer();
		await this.setAndSendDescription(localDescription);
	}

	updateConnectionState() {
		const rtcState = this.rtcConnection.connectionState;
		/** @type {import("./MessageHandler.js").EditorConnectionState} */
		let state = "disconnected";
		if (rtcState == "new" || rtcState == "connecting") {
			state = "connecting";
		} else if (rtcState == "connected") {
			state = "connecting";
			if (this.dataChannels.size > 0) {
				let allConnected = true;
				for (const channel of this.dataChannels.values()) {
					if (channel.readyState != "open") {
						allConnected = false;
						break;
					}
				}
				if (allConnected) {
					state = "connected";
				}
			}
		}
		this.setConnectionState(state);
	}

	/**
	 * @param {string} label
	 * @param {RTCDataChannelInit} options
	 * @returns {RTCDataChannel}
	 */
	createDataChannel(label, options = {}) {
		const channel = this.rtcConnection.createDataChannel(label, options);
		this.addDataChannelListeners(channel);
		this.dataChannels.set(label, channel);
		return channel;
	}

	/**
	 * @param {RTCDataChannel} channel
	 */
	addDataChannelListeners(channel) {
		channel.addEventListener("open", e => {
			this.updateConnectionState();
		});
		channel.addEventListener("message", e => {
			this.handleMessageReceived(e.data);
		});
	}

	/**
	 * @param {RTCSessionDescriptionInit} localDescription
	 */
	async setAndSendDescription(localDescription) {
		this.localDescription = localDescription;
		await this.rtcConnection.setLocalDescription(localDescription);
		this.connectionsManager.sendRtcOffer(this.otherClientUuid, localDescription);
	}

	/**
	 * @param {RTCSessionDescriptionInit} rtcDescription
	 */
	async handleRtcOffer(rtcDescription) {
		this.remoteDescription = rtcDescription;
		await this.rtcConnection.setRemoteDescription(rtcDescription);

		if (rtcDescription.type == "offer") {
			const localDescription = await this.rtcConnection.createAnswer();
			await this.setAndSendDescription(localDescription);
		}
	}

	/**
	 * @param {RTCIceCandidateInit} iceCandidate
	 */
	async handleRtcIceCandidate(iceCandidate) {
		this.rtcConnection.addIceCandidate(iceCandidate);
	}

	/**
	 * @override
	 * @param {*} data
	 */
	send(data) {
		const channel = this.dataChannels.get("reliable");
		if (!channel) throw new Error("Assertion failed, reliable channel does not exist.");
		channel.send(data);
	}
}
