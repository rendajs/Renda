export default class MessageHandlerWebRtc {
	/**
	 * @param {import("../../../Util/Util.js").UuidString} otherClientUuid
	 * @param {import("../EditorConnectionsManager.js").default} connectionsManager
	 * @param {boolean} [isInitiator = false]
	 */
	constructor(otherClientUuid, connectionsManager, isInitiator = false) {
		this.otherClientUuid = otherClientUuid;
		this.connectionsManager = connectionsManager;
		this.isInitiator = isInitiator;

		this.rtcConnection = new RTCPeerConnection();
		this.dataChannel = null;
		this.localDescription = null;
		this.remoteDescription = null;

		this.rtcConnection.addEventListener("icecandidate", e => {
			console.log("icecandidate", e);
		});
		this.rtcConnection.addEventListener("iceconnectionstatechange", e => {
			console.log("iceconnectionstatechange", e);
		});
		this.rtcConnection.addEventListener("datachannel", e => {
			console.log("datachannel", e);
			this.dataChannel = e.channel;
		});
		this.rtcConnection.addEventListener("connectionstatechange", e => {
			console.log("connectionstatechange", e);
		});
		this.rtcConnection.addEventListener("negotiationneeded", e => {
			console.log("negotiationneeded", e);
			this.initWebRtcConnection();
		});

		if (this.isInitiator) {
			this.rtcConnection.createDataChannel("reliable");
		}
	}

	async initWebRtcConnection() {
		if (!this.isInitiator) return;

		this.localDescription = await this.rtcConnection.createOffer();
		await this.setAndSendDescription(this.localDescription);
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
}
