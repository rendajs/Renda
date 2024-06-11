/**
 * @template {(...args: any[]) => any} TFunc
 */
export class SingleInstancePromise {
	/** @typedef {Awaited<Parameters<TFunc>>} TArgs */
	/** @typedef {Awaited<ReturnType<TFunc>>} TReturn */

	/**
	 * @typedef QueueEntry
	 * @property {(result: TReturn) => void} resolve
	 * @property {(result: unknown) => void} reject
	 * @property {TArgs} args
	 */

	#promiseFn;

	#once;
	get once() {
		return this.#once;
	}

	/** @type {QueueEntry[]} */
	#queue = [];
	#isEmptyingQueue = false;
	/** @type {{resolved: boolean, result: TReturn} | undefined} */
	#onceReturnValue = undefined;
	/** @type {Set<() => void>} */
	#onFinishCbs = new Set();

	/**
	 * @param {TFunc} promiseFn
	 * @param {object} opts
	 * @param {boolean} [opts.once] If true, the function will only be run once.
	 * Repeated calls will return the first result. `false` by default.
	 */
	constructor(promiseFn, {
		once = false,
	} = {}) {
		this.#once = once;
		this.#promiseFn = promiseFn;

		this.hasRun = false;
	}

	/**
	 * Runs the function. If the function is already running, the call will be
	 * queued once. Ensuring that the last call is always run. If this function
	 * is called many times while it is already running, only the last call
	 * will be executed.
	 * @param {TArgs} args
	 * @returns {Promise<TReturn>}
	 */
	async run(...args) {
		if (this.hasRun && this.#once && this.#onceReturnValue) {
			if (this.#onceReturnValue.resolved) {
				return /** @type {TReturn} */ (this.#onceReturnValue);
			} else {
				throw this.#onceReturnValue.result;
			}
		}

		/** @type {Promise<TReturn>} */
		const myPromise = new Promise((resolve, reject) => this.#queue.push({ resolve, reject, args }));
		this._emptyQueue();
		return await myPromise;
	}

	/**
	 * @private
	 */
	async _emptyQueue() {
		if (this.#isEmptyingQueue) return;
		this.#isEmptyingQueue = true;

		while (this.#queue.length > 0) {
			if (this.#once && this.hasRun && this.#onceReturnValue) {
				if (this.#onceReturnValue.resolved) {
					const returnValue = /** @type {TReturn} */ (this.#onceReturnValue.result);
					this.#queue.forEach((entry) => entry.resolve(returnValue));
				} else {
					const error = this.#onceReturnValue.result;
					this.#queue.forEach((entry) => entry.reject(error));
				}
				this.#queue = [];
				break;
			}
			const queueCopy = this.#queue;
			this.#queue = [];

			const lastEntry = /** @type {QueueEntry} */ (queueCopy.at(-1));

			this.#isEmptyingQueue = true;
			let resolved = false;
			let result;
			try {
				result = await this.#promiseFn(...lastEntry.args);
				resolved = true;
			} catch (e) {
				result = e;
			}
			this.#isEmptyingQueue = false;
			this.hasRun = true;
			this.#onFinishCbs.forEach((cb) => cb());
			this.#onFinishCbs.clear();

			if (this.#once) {
				this.#onceReturnValue = { resolved, result };
			}

			if (resolved) {
				for (const { resolve } of queueCopy) {
					resolve(result);
				}
			} else {
				for (const { reject } of queueCopy) {
					reject(result);
				}
			}
		}
		this.#isEmptyingQueue = false;
	}

	/**
	 * Returns a promise that will resolve once the function is done running.
	 * Will stay pending if the function is not running, either because it is done or if it hasn't run yet.
	 * In this case the promise will resolve once the next run finishes.
	 *
	 * ## Example
	 * ```js
	 * const instance = new SingleInstancePromise(...);
	 * const promise1 = instance.waitForFinish(); // promise1 is initially pending
	 *
	 * await instance.run();
	 * // Once the first run is done, promise1 becomes resolved.
	 *
	 * // But new calls will start as a pending promise again:
	 * const promise2 = instance.waitForFinish(); // promise2 is pending
	 *
	 * // Until you run again
	 * await instance.run();
	 * ```
	 * @returns {Promise<void>}
	 */
	async waitForFinish() {
		if (this.#once) {
			throw new Error("waitForFinish() would stay pending forever when once has been set, use waitForFinishOnce() instead.");
		}
		/** @type {Promise<void>} */
		const promise = new Promise((r) => this.#onFinishCbs.add(r));
		await promise;
	}

	/**
	 * Returns a promise that will resolve once the function has run for the first time.
	 * Resolves immediately when the function is done running, even when it is currently running for a second time.
	 * If the function hasn't run yet, this promise will resolve once it's done running for the first time.
	 *
	 * ## Example
	 * ```js
	 * const instance = new SingleInstancePromise(...);
	 * const promise1 = instance.waitForFinishOnce(); // promise1 is initially pending
	 *
	 * await instance.run();
	 * // Once the first run is done, promise1 becomes resolved.
	 *
	 * // And new calls will immediately resolve as well
	 * const promise2 = instance.waitForFinishOnce(); // promise2 is resolved
	 *
	 * // Even if you run it a second time:
	 * const runA = instance.run();
	 * const promise3 = instance.waitForFinishOnce(); // promise3 is still instantly resolved
	 *
	 * // Only runA is now pending until the second run finishes.
	 * ```
	 * @returns {Promise<void>}
	 */
	async waitForFinishOnce() {
		if (this.hasRun) return;
		/** @type {Promise<void>} */
		const promise = new Promise((r) => this.#onFinishCbs.add(r));
		await promise;
	}

	/**
	 * Returns a promise that will resolve once all calls to the function are done running.
	 * Resolves immediately if the function is not running, either because it is done, or if it hasn't run yet.
	 * If a new call is made to `run` while the function was still running,
	 * this promise will not resolve until that run is done as well.
	 *
	 * ## Example
	 * ```js
	 * const instance = new SingleInstancePromise(...);
	 * const promise1 = instance.waitForFinishIfRunning(); // promise1 is immediately resolved
	 *
	 * const runA = instance.run();
	 * const promise2 = instance.waitForFinishIfRunning(); // runA and promise2 are both pending
	 *
	 * const runB = instance.run();
	 * // runA, promise2, and runB are all pending.
	 *
	 * await runA;
	 * // Eventually runA resolves, but promise2 and runB are still pending.
	 *
	 * await runB;
	 * // Only once runB is done, do promise2 and runB resolve.
	 *
	 * const promise3 = instance.waitForFinishIfRunning(); // new calls immediately resolve again
	 * ```
	 */
	async waitForFinishIfRunning() {
		while (this.#isEmptyingQueue) {
			/** @type {Promise<void>} */
			const promise = new Promise((r) => this.#onFinishCbs.add(r));
			await promise;
		}
	}
}
