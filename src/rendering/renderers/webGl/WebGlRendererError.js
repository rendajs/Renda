/** @typedef {"not-supported"} WebGpuRendererErrorReason */
export class WebGlRendererError extends Error {
	/**
	 * @param {WebGpuRendererErrorReason} reason
	 * @param {string} message
	 */
	constructor(reason, message) {
		super(message);
		this.reason = reason;
		this.name = this.constructor.name;
	}
}
