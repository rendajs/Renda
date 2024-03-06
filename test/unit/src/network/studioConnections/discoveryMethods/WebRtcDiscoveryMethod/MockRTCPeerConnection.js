import { AssertionError, assertEquals } from "std/testing/asserts.ts";
import { MockRTCDataChannel } from "./MockRTCDataChannel.js";

/** @type {Set<MockRTCPeerConnection>} */
const createdRtcConnections = new Set();

/**
 * Asserts that exactly only one MockRTCPeerConnection was created and returns it.
 */
export function getSingleCreatedRtcConnection() {
	assertEquals(createdRtcConnections.size, 1);
	for (const socket of createdRtcConnections) {
		return socket;
	}
	throw new AssertionError("");
}

export function clearCreatedRtcConnections() {
	createdRtcConnections.clear();
}

export class MockRTCPeerConnection extends EventTarget {
	/** @type {RTCSessionDescription?} */
	#localDescription = null;
	/** @type {RTCSessionDescription?} */
	#remoteDescription = null;

	constructor() {
		super();
		createdRtcConnections.add(this);
	}

	get localDescription() {
		return this.#localDescription;
	}

	get remoteDescription() {
		return this.#remoteDescription;
	}
	/**
	 * @param {RTCLocalSessionDescriptionInit} [description]
	 */
	async setLocalDescription(description) {
		this.#localDescription = /** @type {RTCSessionDescription} */ ({
			type: description?.type || "offer",
			sdp: description?.sdp || "",
		});
	}

	/**
	 * @param {RTCLocalSessionDescriptionInit} description
	 */
	async setRemoteDescription(description) {
		this.#remoteDescription = /** @type {RTCSessionDescription} */ ({
			type: description.type || "",
			sdp: description.sdp || "",
		});
	}

	/**
	 * @returns {Promise<RTCSessionDescriptionInit>}
	 */
	async createOffer() {
		return {
			type: "offer",
		};
	}

	/**
	 * @returns {Promise<RTCSessionDescriptionInit>}
	 */
	async createAnswer() {
		return {
			type: "answer",
		};
	}

	/** @type {Set<RTCIceCandidateInit>} */
	#addedIceCandidates = new Set();

	get addedIceCandidates() {
		return Array.from(this.#addedIceCandidates);
	}

	/**
	 * @param {RTCIceCandidateInit} iceCandidate
	 */
	addIceCandidate(iceCandidate) {
		this.#addedIceCandidates.add(iceCandidate);
	}

	/**
	 * @param {string} label
	 * @param {RTCDataChannelInit} options
	 */
	createDataChannel(label, options) {
		return new MockRTCDataChannel(label);
	}

	/** @type {RTCPeerConnectionState} */
	#connectionState = "new";
	get connectionState() {
		return this.#connectionState;
	}

	/**
	 * @param {RTCPeerConnectionState} state
	 */
	setMockConnectionState(state) {
		this.#connectionState = state;
		this.dispatchEvent(new Event("connectionstatechange"));
	}

	/**
	 * Same as `createDataChannel` except it fires an event.
	 * This essentially simulates a datachannel being created by the other peer.
	 * @param {string} label
	 */
	addMockDataChannel(label) {
		const datachannel = new MockRTCDataChannel(label);
		const mockDataChannelEvent = /** @type {Event & {channel: MockRTCDataChannel}} */ (new Event("datachannel"));
		mockDataChannelEvent.channel = datachannel;
		this.dispatchEvent(mockDataChannelEvent);
		return datachannel;
	}
}
