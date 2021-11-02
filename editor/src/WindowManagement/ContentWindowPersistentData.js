export class ContentWindowPersistentData {
	#data = new Map();
	#onWindowManagerCbs = new Set();
	/** @type {import("./WindowManager.js").default} */
	#windowManager = null;

	/**
	 * @param {import("./WindowManager.js").default} windowManager
	 */
	setWindowManager(windowManager) {
		this.#windowManager = windowManager;
		this.#onWindowManagerCbs.forEach(cb => cb());
		this.#onWindowManagerCbs.clear();
	}

	async #waitForWindowManager() {
		if (this.#windowManager) return;
		await new Promise(r => this.#onWindowManagerCbs.add(r));
	}

	/**
	 * @param {string} key
	 */
	async get(key) {
		// todo: wait for data to be loaded
		return this.#data.get(key);
	}

	/**
	 * @param {string} key
	 * @param {*} value
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
		await this.#waitForWindowManager();
		await this.#windowManager.requestContentWindowPersistentDataFlush();
	}

	isEmpty() {
		return this.#data.size <= 0;
	}

	getAll() {
		const data = {};
		for (const [k, v] of this.#data) {
			data[k] = v;
		}
		return data;
	}
}
