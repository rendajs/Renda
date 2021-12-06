/**
 * Utility class for managing timeouts.
 */
export class Timeout {
	/**
	 * @param {number} ms The number of milliseconds to wait before calling the callback.
	 * @param {Function} cb The callback to call when the timeout fires.
	 * @param {boolean} startAtCreation
	 */
	constructor(ms, cb, startAtCreation = false) {
		this.id = -1;
		this.ms = ms;
		this.cb = cb;
		this.isDestructed = false;

		if (startAtCreation) {
			this.start();
		}
	}

	destructor() {
		this.stop();
		this.isDestructed = true;
		this.cb = null;
	}

	get isRunning() {
		return this.id != -1;
	}

	/**
	 * @returns {boolean} True if the timeout was running and is now cleared, false if there was no timeout running.
	 */
	stop() {
		if (this.isDestructed) return false;
		if (this.id >= 0) {
			globalThis.clearTimeout(this.id);
			this.id = -1;
			return true;
		}
		return false;
	}

	/**
	 * Starts the timeout. If it's already running then it restarts it.
	 * @param {number} ms Optionally override the wait time.
	 */
	start(ms = this.ms) {
		if (this.isDestructed) return;
		this.stop();
		// @ts-ignore
		this.id = globalThis.setTimeout(this.execute.bind(this), ms);
	}

	execute() {
		this.id = -1;
		if (this.cb) this.cb();
	}
}

/**
 * Utility function for waiting inside of promises.
 * @param {number} ms How long to wait for the promise to resolve.
 * @returns {Promise} A promise that resolves after the specified time.
 */
export function wait(ms) {
	return new Promise((resolve, reject) => {
		globalThis.setTimeout(() => {
			resolve();
		}, ms);
	});
}
