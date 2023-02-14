export class ContentWindowPersistentData {
	/** @type {Map<string, unknown>} */
	#data = new Map();
	/** @type {Set<(windowManager: import("./WindowManager.js").WindowManager) => any>} */
	#onWindowManagerCbs = new Set();
	/** @type {import("./WindowManager.js").WindowManager?} */
	#windowManager = null;
	/** @type {Set<() => void>} */
	#onDataLoadCbs = new Set();

	/**
	 * @param {import("./WindowManager.js").WindowManager} windowManager
	 */
	setWindowManager(windowManager) {
		this.#windowManager = windowManager;
		this.#onWindowManagerCbs.forEach(cb => cb(windowManager));
		this.#onWindowManagerCbs.clear();
	}

	async #waitForWindowManager() {
		if (this.#windowManager) return this.#windowManager;
		/** @type {Promise<import("./WindowManager.js").WindowManager>} */
		const promise = new Promise(r => this.#onWindowManagerCbs.add(r));
		return await promise;
	}

	/**
	 * Returns the current value of an item. Note that this might not be available yet when the window loads.
	 * To ensure your content window stays up to date, make sure to use {@linkcode onDataLoad}.
	 * @param {string} key
	 */
	get(key) {
		return this.#data.get(key);
	}

	/**
	 * @param {string} key
	 * @param {unknown} value
	 * @param {boolean} flush
	 */
	async set(key, value, flush = true) {
		this.#data.set(key, value);
		if (flush) {
			await this.flush();
		}
	}

	/**
	 * Writes the data to local project settings.
	 */
	async flush() {
		const windowManager = await this.#waitForWindowManager();
		await windowManager.requestContentWindowPersistentDataFlush();
	}

	isEmpty() {
		return this.#data.size <= 0;
	}

	/**
	 * Used by the WindowManager when saving the data.
	 */
	getAll() {
		/** @type {Object<string, unknown>} */
		const data = {};
		for (const [k, v] of this.#data) {
			data[k] = v;
		}
		return data;
	}

	/**
	 * Used by the WindowManager when loading the data.
	 * @param {object} data
	 */
	setAll(data) {
		this.#data.clear();
		for (const [k, v] of Object.entries(data)) {
			this.#data.set(k, v);
		}
		this.#onDataLoadCbs.forEach(cb => cb());
	}

	/**
	 * Fires when data from the project has loaded.
	 * @param {() => void} cb
	 */
	onDataLoad(cb) {
		this.#onDataLoadCbs.add(cb);
	}

	/**
	 * Fires when data from the project has loaded.
	 * @param {() => void} cb
	 */
	removeOnDataLoad(cb) {
		this.#onDataLoadCbs.delete(cb);
	}
}
