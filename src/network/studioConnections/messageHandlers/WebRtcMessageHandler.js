import { MessageHandler } from "./MessageHandler.js";

/**
 * @typedef WebRtcMessageHandlerOptions
 * @property {(candidate: RTCIceCandidate) => void} sendRtcIceCandidate
 * @property {(offer: RTCSessionDescriptionInit) => void} sendRtcDescription
 * @property {(accepted: boolean) => void} onPermissionResult
 */

export class WebRtcMessageHandler extends MessageHandler {
	/**
	 * @param {import("./MessageHandler.js").MessageHandlerOptions} messageHandlerOptions
	 * @param {WebRtcMessageHandlerOptions} options
	 */
	constructor(messageHandlerOptions, { sendRtcIceCandidate, sendRtcDescription, onPermissionResult }) {
		super(messageHandlerOptions);
		/** @private */
		this.sendRtcDescription = sendRtcDescription;
		/** @private */
		this.onPermissionResult = onPermissionResult;
		/** @private @type {boolean?} */
		this.permissionResult = null;

		/** @private @type {Set<() => void>} */
		this._waitForConnectedCbs = new Set();
		/** @private */
		this.rtcConnection = new RTCPeerConnection();
		/** @private @type {Map<string, RTCDataChannel>} */
		this.dataChannels = new Map();

		this.rtcConnection.addEventListener("icecandidate", (e) => {
			if (e.candidate) {
				sendRtcIceCandidate(e.candidate);
			}
		});
		this.rtcConnection.addEventListener("datachannel", (e) => {
			this.addDataChannelListeners(e.channel);
			this.dataChannels.set(e.channel.label, e.channel);
		});
		this.rtcConnection.addEventListener("connectionstatechange", (e) => {
			this.updateStatus();
		});
		this.rtcConnection.addEventListener("negotiationneeded", (e) => {
			this.initWebRtcConnection();
		});

		if (this.initiatedByMe) {
			this.createDataChannel("reliable");
			this.createDataChannel("unreliable", {
				maxRetransmits: 0,
			});
		}

		this.updateStatus();
	}

	/**
	 * @override
	 */
	requestAccepted() {
		this.onPermissionResult(true);
	}

	/**
	 * @abstract
	 */
	requestRejected() {
		this.onPermissionResult(false);
	}

	/**
	 * @param {boolean} accepted
	 */
	handlePermissionResult(accepted) {
		this.permissionResult = accepted;
		this.updateStatus();
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
		let newStatus = "disconnected";
		if (rtcState == "new" || rtcState == "connecting") {
			newStatus = "connecting";
		} else if (rtcState == "connected") {
			newStatus = "connecting";
			if (this.dataChannels.size > 0) {
				let allConnected = true;
				for (const channel of this.dataChannels.values()) {
					if (channel.readyState != "open") {
						allConnected = false;
						break;
					}
				}
				if (allConnected) {
					if (this.permissionResult == null) {
						newStatus = "outgoing-permission-pending";
					} else if (this.permissionResult) {
						newStatus = "connected";
					} else {
						newStatus = "outgoing-permission-rejected";
					}
				}
			}
		}
		if (newStatus == "connected") {
			this._waitForConnectedCbs.forEach((cb) => cb());
			this._waitForConnectedCbs.clear();
		}
		this.setStatus(newStatus);
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
		channel.addEventListener("open", (e) => {
			this.updateStatus();
		});
		channel.addEventListener("message", (e) => {
			this.handleMessageReceived(e.data);
		});
	}

	/**
	 * @private
	 * @param {RTCSessionDescriptionInit} localDescription
	 */
	async setAndSendDescription(localDescription) {
		await this.rtcConnection.setLocalDescription(localDescription);
		this.sendRtcDescription(localDescription);
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
	 * @private
	 */
	_waitForConnected() {
		if (this.status == "connected") return;
		/** @type {Promise<void>} */
		const promise = new Promise((resolve) => {
			this._waitForConnectedCbs.add(resolve);
		});
		return promise;
	}

	/**
	 * @override
	 * @param {unknown} data
	 */
	async send(data) {
		await this._waitForConnected();
		const channel = this.dataChannels.get("reliable");
		if (!channel) throw new Error("Assertion failed, reliable channel does not exist.");
		if (!(data instanceof ArrayBuffer)) {
			throw new Error("This message handler only supports sending array buffers.");
		}
		channel.send(data);
	}
}
