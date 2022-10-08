/**
 * @template TReturn
 */
export class SingleInstancePromise {
	/**
	 * @param {() => Promise<TReturn>} promiseFn
	 * @param {object} opts
	 * @param {boolean} [opts.once] If true, the function will only be run once. Repeated calls will return the first result.
	 */
	constructor(promiseFn, {
		once = false,
	} = {}) {
		this.once = once;
		this.promiseFn = promiseFn;
		this.isRunning = false;
		this.hasRan = false;
		this.onceReturnValue = undefined;
		/** @type {Set<(result: TReturn) => void>} */
		this.onRunFinishCbs = new Set();
	}

	/**
	 * Runs the function. If the function is already running,the call will be
	 * queued once. Ensuring that the last call is always run. If this function
	 * is called many times while it is already running, only the last call
	 * will be executed.
	 * @returns {Promise<TReturn>}
	 */
	async run() {
		if (this.isRunning) {
			if (!this.once) {
				await new Promise(r => this.onRunFinishCbs.add(r));
				return await this.run();
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
	 * If the function hasn't run yet, this promise will resolve once it's done
	 * running for the first time. So you might have to call {@linkcode run} for
	 * this to resolve.
	 * @returns {Promise<void>}
	 */
	async waitForFinish() {
		if (this.hasRan) return;
		await new Promise(r => this.onRunFinishCbs.add(r));
	}

	/**
	 * Returns a promise that will resolve once the function is done running.
	 * Resolves immediately if the function is not running, either because its
	 * done or if it has already run.
	 */
	async waitForFinishIfRunning() {
		if (!this.isRunning) return;
		await new Promise(r => this.onRunFinishCbs.add(r));
	}
}
