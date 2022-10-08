/**
 * @template {(...args: any[]) => any} TFunc
 */
export class SingleInstancePromise {
	/** @typedef {Awaited<Parameters<TFunc>>} TArgs */
	/** @typedef {Awaited<ReturnType<TFunc>>} TReturn */

	/**
	 * @typedef QueueEntry
	 * @property {(result: TReturn) => void} resolve
	 * @property {TArgs} args
	 */

	/**
	 * @param {TFunc} promiseFn
	 * @param {object} opts
	 * @param {boolean} [opts.once] If true, the function will only be run once. Repeated calls will return the first result.
	 */
	constructor(promiseFn, {
		once = false,
	} = {}) {
		this.once = once;
		this.promiseFn = promiseFn;

		/** @type {QueueEntry[]} */
		this._queue = [];
		this._isEmptyingQueue = false;
		this.hasRun = false;
		this.onceReturnValue = undefined;
		/** @type {Set<() => void>} */
		this._onFinishCbs = new Set();
	}

	/**
	 * Runs the function. If the function is already running,the call will be
	 * queued once. Ensuring that the last call is always run. If this function
	 * is called many times while it is already running, only the last call
	 * will be executed.
	 * @param {TArgs} args
	 * @returns {Promise<TReturn>}
	 */
	async run(...args) {
		if (this.hasRun && this.once) {
			return /** @type {TReturn} */ (this.onceReturnValue);
		}

		/** @type {Promise<TReturn>} */
		const myPromise = new Promise(resolve => this._queue.push({resolve, args}));
		this._emptyQueue();
		return await myPromise;
	}

	/**
	 * @private
	 */
	async _emptyQueue() {
		if (this._isEmptyingQueue) return;

		this._isEmptyingQueue = true;
		while (this._queue.length > 0) {
			const queueCopy = this._queue;
			this._queue = [];

			const lastEntry = /** @type {QueueEntry} */ (queueCopy.at(-1));

			this._isEmptyingQueue = true;
			const result = await this.promiseFn(...lastEntry.args);
			this._isEmptyingQueue = false;
			this.hasRun = true;

			if (this.once) {
				this.onceReturnValue = result;
			}

			for (const {resolve} of queueCopy) {
				resolve(result);
			}
		}
		this._isEmptyingQueue = false;
	}

	/**
	 * Returns a promise that will resolve once the function has run at least once.
	 * If the function hasn't run yet, this promise will resolve once it's done
	 * running for the first time. So {@linkcode run} has to have been called at
	 * least once for this to resolve at all.
	 * @returns {Promise<void>}
	 */
	async waitForFinish() {
		if (this.hasRun) return;
		/** @type {Promise<void>} */
		const promise = new Promise(r => this._onFinishCbs.add(r));
		await promise;
	}

	/**
	 * Returns a promise that will resolve once the function is done running.
	 * Resolves immediately if the function is not running, either because its
	 * done or if it has already run.
	 */
	async waitForFinishIfRunning() {
		if (!this._isEmptyingQueue) return;
		/** @type {Promise<void>} */
		const promise = new Promise(r => this._onFinishCbs.add(r));
		await promise;
	}
}
