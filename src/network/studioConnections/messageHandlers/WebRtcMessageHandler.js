import {MessageHandler} from "./MessageHandler.js";

/**
 * @typedef WebRtcMessageHandlerOptions
 * @property {(uuid: import("../../../mod.js").UuidString, candidate: RTCIceCandidate) => void} sendRtcIceCandidate
 * @property {(uuid: import("../../../mod.js").UuidString, offer: RTCSessionDescriptionInit) => void} sendRtcDescription
 */

export class WebRtcMessageHandler extends MessageHandler {
	/**
	 * @param {import("./MessageHandler.js").MessageHandlerOptions} messageHandlerOptions
	 * @param {WebRtcMessageHandlerOptions} options
	 */
	constructor(messageHandlerOptions, {sendRtcIceCandidate, sendRtcDescription}) {
		super(messageHandlerOptions);
		/** @private */
		this.sendRtcDescription = sendRtcDescription;

		/** @private */
		this.rtcConnection = new RTCPeerConnection();
		/** @private @type {Map<string, RTCDataChannel>} */
		this.dataChannels = new Map();

		this.rtcConnection.addEventListener("icecandidate", e => {
			if (e.candidate) {
				sendRtcIceCandidate(this.otherClientUuid, e.candidate);
			}
		});
		this.rtcConnection.addEventListener("datachannel", e => {
			this.addDataChannelListeners(e.channel);
			this.dataChannels.set(e.channel.label, e.channel);
		});
		this.rtcConnection.addEventListener("connectionstatechange", e => {
			this.updateStatus();
		});
		this.rtcConnection.addEventListener("negotiationneeded", e => {
			this.initWebRtcConnection();
		});

		if (this.initiatedByMe) {
			this.createDataChannel("reliable");
			this.createDataChannel("unreliable", {
				maxRetransmits: 0,
			});
		}
	}

	/**
	 * @private
	 */
	async initWebRtcConnection() {
		if (!this.initiatedByMe) return;

		const localDescription = await this.rtcConnection.createOffer();
		await this.setAndSendDescription(localDescription);
	}

	/**
	 * @private
	 */
	updateStatus() {
		const rtcState = this.rtcConnection.connectionState;
		/** @type {import("./MessageHandler.js").MessageHandlerStatus} */
		let status = "disconnected";
		if (rtcState == "new" || rtcState == "connecting") {
			status = "connecting";
		} else if (rtcState == "connected") {
			status = "connecting";
			if (this.dataChannels.size > 0) {
				let allConnected = true;
				for (const channel of this.dataChannels.values()) {
					if (channel.readyState != "open") {
						allConnected = false;
						break;
					}
				}
				if (allConnected) {
					status = "connected";
				}
			}
		}
		this.setStatus(status);
	}

	/**
	 * @private
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
	 * @private
	 * @param {RTCDataChannel} channel
	 */
	addDataChannelListeners(channel) {
		channel.addEventListener("open", e => {
			this.updateStatus();
		});
		channel.addEventListener("message", e => {
			this.handleMessageReceived(e.data);
		});
	}

	/**
	 * @private
	 * @param {RTCSessionDescriptionInit} localDescription
	 */
	async setAndSendDescription(localDescription) {
		await this.rtcConnection.setLocalDescription(localDescription);
		this.sendRtcDescription(this.otherClientUuid, localDescription);
	}

	/**
	 * @param {RTCSessionDescriptionInit} rtcDescription
	 */
	async handleRtcDescription(rtcDescription) {
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
