import MessageHandler from "./MessageHandler.js";

export default class MessageHandlerWebRtc extends MessageHandler {
	/**
	 * @param {import("../../../Util/Util.js").UuidString} otherClientUuid
	 * @param {import("../EditorConnectionsManager.js").default} connectionsManager
	 * @param {boolean} [isInitiator = false]
	 */
	constructor(otherClientUuid, connectionsManager, isInitiator = false) {
		super();
		this.otherClientUuid = otherClientUuid;
		this.connectionsManager = connectionsManager;
		this.isInitiator = isInitiator;

		this.rtcConnection = new RTCPeerConnection();
		this.localDescription = null;
		this.remoteDescription = null;
		this.dataChannels = new Map();

		this.rtcConnection.addEventListener("icecandidate", e => {
			this.connectionsManager.sendRtcIceCandidate(this.otherClientUuid, e.candidate);
		});
		this.rtcConnection.addEventListener("datachannel", e => {
			this.addDataChannelListeners(e.channel);
			this.dataChannels.set(e.channel.label, e.channel);
		});
		this.rtcConnection.addEventListener("connectionstatechange", e => {
			console.log("connectionstatechange", this.rtcConnection.connectionState, e);
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

		this.localDescription = await this.rtcConnection.createOffer();
		await this.setAndSendDescription(this.localDescription);
	}

	/**
	 * @param {string} label
	 * @param {RTCDataChannelInit} [options]
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
		channel.addEventListener("message", e => {
			let json = null;
			try {
				json = JSON.parse(e.data);
			} catch (e) {
				console.error("Error parsing data channel message", e);
				return;
			}
			this.onMessage(json);
		});
	}

	/**
	 * @param {RTCSessionDescriptionInit} rtcDescription
	 */
	async setAndSendDescription(rtcDescription) {
		await this.rtcConnection.setLocalDescription(rtcDescription);
		this.connectionsManager.sendRtcOffer(this.otherClientUuid, this.localDescription);
	}

	/**
	 * @param {RTCSessionDescriptionInit} rtcDescription
	 */
	async handleRtcOffer(rtcDescription) {
		this.remoteDescription = rtcDescription;
		await this.rtcConnection.setRemoteDescription(rtcDescription);

		if (rtcDescription.type == "offer") {
			this.localDescription = await this.rtcConnection.createAnswer();
			await this.setAndSendDescription(this.localDescription);
		}
	}

	/**
	 *
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
		this.dataChannels.get("reliable").send(JSON.stringify(data));
	}
}
