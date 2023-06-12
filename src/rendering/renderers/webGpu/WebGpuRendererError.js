/** @typedef {"not-supported" | "no-adapter-available"} WebGpuRendererErrorReason */
export class WebGpuRendererError extends Error {
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
