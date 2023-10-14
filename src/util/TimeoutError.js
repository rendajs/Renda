export class TimeoutError extends Error {
	/**
	 * @param {string} message
	 */
	constructor(message) {
		super(message);
		this.name = "TimeoutError";
	}
}
