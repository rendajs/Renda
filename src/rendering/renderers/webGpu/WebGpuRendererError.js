/** @typedef {"not-supported" | "no-adapter-available"} WebGpuRendererErrorTypes */
export class WebGpuRendererError extends Error {
	/**
	 * @param {WebGpuRendererErrorTypes} name
	 * @param {string} message
	 */
	constructor(name, message) {
		super(message);
		this.name = name;
	}
}
