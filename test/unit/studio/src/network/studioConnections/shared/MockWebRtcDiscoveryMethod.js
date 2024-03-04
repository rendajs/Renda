import { ExtendedDiscoveryMethod } from "../../../../../src/network/studioConnections/discoveryMethods/shared/ExtendedDiscoveryMethod.js";

/** @type {Set<WebRtcDiscoveryMethod>} */
const createdDiscoveryMethods = new Set();

export function *getCreatedWebRtcDiscoveryMethods() {
	yield* createdDiscoveryMethods;
}

export function clearCreatedWebRtcDiscoveryMethods() {
	createdDiscoveryMethods.clear();
}

export class WebRtcDiscoveryMethod extends ExtendedDiscoveryMethod {
	static type = "renda:webrtc";

	/**
	 * @param {string} endpoint
	 */
	constructor(endpoint) {
		super();
		createdDiscoveryMethods.add(this);
		this.endpoint = endpoint;
	}

	/** @type {import("../../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").DiscoveryServerStatusType} */
	status = "connecting";

	/** @type {Set<import("../../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").OnDiscoveryManagerWebRtcStatusChangeCallback>} */
	#onStatusChangeCbs = new Set();

	/**
	 * @param {import("../../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").OnDiscoveryManagerWebRtcStatusChangeCallback} cb
	 */
	onStatusChange(cb) {
		this.#onStatusChangeCbs.add(cb);
	}

	/**
	 * @param {import("../../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").DiscoveryServerStatusType} status
	 */
	setStatus(status) {
		this.status = status;
		this.#onStatusChangeCbs.forEach(cb => cb(status));
	}
}
