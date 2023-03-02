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
	 * @param {boolean} [opts.once] If true, the function will only be run once.
	 * Repeated calls will return the first result. `false` by default.
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
		/** @type {TReturn | undefined} */
		this._onceReturnValue = undefined;
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
			return /** @type {TReturn} */ (this._onceReturnValue);
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
			if (this.once && this.hasRun) {
				const returnValue = /** @type {TReturn} */ (this._onceReturnValue);
				this._queue.forEach(entry => entry.resolve(returnValue));
				this._queue = [];
				break;
			}
			const queueCopy = this._queue;
			this._queue = [];

			const lastEntry = /** @type {QueueEntry} */ (queueCopy.at(-1));

			this._isEmptyingQueue = true;
			const result = await this.promiseFn(...lastEntry.args);
			this._isEmptyingQueue = false;
			this.hasRun = true;
			this._onFinishCbs.forEach(cb => cb());
			this._onFinishCbs.clear();

			if (this.once) {
				this._onceReturnValue = result;
			}

			for (const {resolve} of queueCopy) {
				resolve(result);
			}
		}
		this._isEmptyingQueue = false;
	}

	/**
	 * Returns a promise that will resolve once the function is done running.
	 * Will stay pending if the function is not running, either because it is done or if it has already run.
	 * In this case the promise will resolve once the next run finishes.
	 * @returns {Promise<void>}
	 */
	async waitForFinish() {
		if (this.once) {
			throw new Error("waitForFinish() will stay pending forever when once has been set, use waitForFinishOnce() instead.");
		}
		/** @type {Promise<void>} */
		const promise = new Promise(r => this._onFinishCbs.add(r));
		await promise;
	}

	/**
	 * Returns a promise that will resolve once the function has run for the first time.
	 * Resolves immediately when the function is done running, even when it is currently running for a second time.
	 * If the function hasn't run yet, this promise will resolve once it's done running for the first time.
	 * @returns {Promise<void>}
	 */
	async waitForFinishOnce() {
		if (this.hasRun) return;
		/** @type {Promise<void>} */
		const promise = new Promise(r => this._onFinishCbs.add(r));
		await promise;
	}

	/**
	 * Returns a promise that will resolve once the function is done running.
	 * Resolves immediately if the function is not running, either because it is done or if it has already run.
	 */
	async waitForFinishIfRunning() {
		if (!this._isEmptyingQueue) return;
		/** @type {Promise<void>} */
		const promise = new Promise(r => this._onFinishCbs.add(r));
		await promise;
	}
}
