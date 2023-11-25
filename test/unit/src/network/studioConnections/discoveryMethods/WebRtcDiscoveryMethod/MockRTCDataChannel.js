export class MockRTCDataChannel extends EventTarget {
	readyState = "connecting";
	label;

	/**
	 * @param {string} label
	 */
	constructor(label) {
		super();
		this.label = label;
	}
	/**
	 * @param {RTCDataChannelState} readyState
	 */
	setMockReadyState(readyState) {
		this.readyState = readyState;
		if (readyState == "open") {
			this.dispatchEvent(new Event("open"));
		}
	}

	send() {}
}
