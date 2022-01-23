/**
 * @template TReturn
 */
export class SingleInstancePromise {
	/**
	 * @param {() => Promise<TReturn>} promiseFn
	 * @param {Object} opts
	 * @param {boolean} [opts.once] If true, the function will only be run once. Repeated calls will return the first result.
	 * @param {boolean} [opts.run] If true, the function will run immediately.
	 */
	constructor(promiseFn, {
		once = true,
		run = false,
	} = {}) {
		this.once = once;
		this.promiseFn = promiseFn;
		this.isRunning = false;
		this.hasRan = false;
		this.onceReturnValue = undefined;
		this.onRunFinishCbs = new Set();

		if (run) this.run();
	}

	/**
	 * Runs the function.
	 * Calling this many times with `repeatIfRunning` set to true will not cause the promise to
	 * run many times. I.e., jobs do not get queued indefinitely, only twice.
	 * @param {boolean} repeatIfRunning If true, the function will run again when the first run is done.
	 * @returns {Promise<TReturn>}
	 */
	async run(repeatIfRunning = false) {
		if (this.isRunning) {
			if (repeatIfRunning && !this.once) {
				await new Promise(r => this.onRunFinishCbs.add(r));
				return await this.run(false);
			} else {
				return await new Promise(r => this.onRunFinishCbs.add(r));
			}
		}

		if (this.hasRan && this.once) {
			return /** @type {TReturn} */ (this.onceReturnValue);
		}

		this.isRunning = true;
		const result = await this.promiseFn();
		this.isRunning = false;
		this.hasRan = true;

		if (this.once) {
			this.onceReturnValue = result;
		}

		const onRunFinishCbsCopy = this.onRunFinishCbs;
		this.onRunFinishCbs = new Set();
		for (const cb of onRunFinishCbsCopy) {
			cb(result);
		}
		return result;
	}

	/**
	 * Returns a promise that will resolve once the function is done running.
	 * Subsequent runs will resolve immediately.
	 * @returns {Promise<void>}
	 */
	async waitForFinish() {
		if (this.hasRan) return;
		await new Promise(r => this.onRunFinishCbs.add(r));
	}

	/**
	 * Returns a promise that will resolve once the function is done running.
	 * Resolves immediately if the function is not running, either because its
	 * dono or if it has already run.
	 */
	async waitForFinishIfRunning() {
		if (!this.isRunning) return;
		await new Promise(r => this.onRunFinishCbs.add(r));
	}
}
