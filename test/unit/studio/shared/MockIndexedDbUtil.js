/** @type {Map<string, Database>} */
const databases = new Map();

class Database {
	#useStructuredClone = true;
	#deleted = false;

	/**
	 * @param {string[]} objectStoreNames
	 */
	constructor(objectStoreNames) {
		/** @type {Map<string, Map<string, unknown>>} */
		this.objectStores = new Map();
		for (const name of objectStoreNames) {
			this.objectStores.set(name, new Map());
		}
	}

	/**
	 * @param {string} objectStoreName
	 */
	#getObjectStore(objectStoreName) {
		if (this.#deleted) throw new Error("Database has been deleted");
		const objectStore = this.objectStores.get(objectStoreName);
		if (!objectStore) {
			// Not sure what the behaviour should be according to the spec
			// but this shouldn't happen anyway so we'll just throw.
			throw new Error(`Object store ${objectStoreName} does not exist`);
		}
		return objectStore;
	}

	/**
	 * @param {boolean} useStructuredClone
	 */
	setUseStructuredClone(useStructuredClone) {
		this.#useStructuredClone = useStructuredClone;
	}

	/**
	 * @param {string} objectStoreName
	 * @param {string} key
	 */
	get(objectStoreName, key) {
		const store = this.#getObjectStore(objectStoreName);
		let value = store.get(key);
		if (this.#useStructuredClone) value = structuredClone(value);
		return value;
	}

	/**
	 * @param {string} objectStoreName
	 * @param {string} key
	 * @param {unknown} value
	 */
	set(objectStoreName, key, value) {
		const store = this.#getObjectStore(objectStoreName);
		if (this.#useStructuredClone) value = structuredClone(value);
		store.set(key, value);
	}

	/**
	 * @param {string} objectStoreName
	 * @param {string} key
	 */
	delete(objectStoreName, key) {
		const store = this.#getObjectStore(objectStoreName);
		store.delete(key);
	}

	/**
	 * @param {string} objectStoreName
	 */
	entries(objectStoreName) {
		const store = this.#getObjectStore(objectStoreName);
		return store.entries();
	}

	deleteDb() {
		this.#deleted = true;
	}
}

/** @type {Promise<void>?} */
let currentForcePendingPromise = null;
/** @type {(() => void)?} */
let currentForcePendingCallback = null;
/**
 * Set to true to cause all promises to stay pending until you set this to
 * false again.
 * @param {boolean} pending
 */
export function forcePendingOperations(pending) {
	if (pending) {
		if (!currentForcePendingCallback) {
			currentForcePendingPromise = new Promise(r => {
				currentForcePendingCallback = r;
			});
		}
	} else {
		if (currentForcePendingCallback) {
			currentForcePendingCallback();
			currentForcePendingCallback = null;
			currentForcePendingPromise = null;
		}
	}
}

export function deleteAllDbs() {
	for (const db of databases.values()) {
		db.deleteDb();
	}
	databases.clear();
}

export class MockIndexedDbUtil {
	#dbName;
	#db;
	#objectStoreNames;

	constructor(dbName = "keyValuesDb", {
		objectStoreNames = ["keyValues"],
	} = {}) {
		this.#dbName = dbName;

		const existingDb = databases.get(dbName);
		if (existingDb) {
			this.#db = existingDb;
		} else {
			this.#db = new Database(objectStoreNames);
			databases.set(dbName, this.#db);
		}

		this.#objectStoreNames = [...objectStoreNames];
	}

	/**
	 * When `get`ting or `set`ting values you and then later modifying it, the stored
	 * object doesn't change when using a real IndexedDb. However this can cause some
	 * issues with objects such as `File`s and `Blob`s because Deno doesn't correctly
	 * serialize them yet (see https://github.com/denoland/deno/issues/12067).
	 * So for some tests that depend on this you can disable cloning to work around
	 * this issue.
	 * @param {boolean} useStructuredClone
	 */
	setUseStructuredClone(useStructuredClone) {
		this.#db.setUseStructuredClone(useStructuredClone);
	}

	/**
	 * @param {string} key
	 */
	async get(key, objectStoreName = this.#objectStoreNames[0]) {
		if (currentForcePendingPromise) await currentForcePendingPromise;
		return this.#db.get(objectStoreName, key);
	}

	/**
	 * @param {string} key
	 * @param {unknown} value
	 */
	async set(key, value, objectStoreName = this.#objectStoreNames[0]) {
		if (currentForcePendingPromise) await currentForcePendingPromise;
		return this.#db.set(objectStoreName, key, value);
	}

	/**
	 * @template T
	 * @param {string} key
	 * @param {(value: T | undefined) => T} cb
	 */
	async getSet(key, cb, objectStoreName = this.#objectStoreNames[0], deleteEntry = false) {
		if (currentForcePendingPromise) await currentForcePendingPromise;
		const value = this.#db.get(objectStoreName, key);
		if (deleteEntry) {
			this.#db.delete(objectStoreName, key);
			return;
		}
		const newValue = cb(/** @type {T | undefined} */ (value));
		this.#db.set(objectStoreName, key, newValue);
	}

	/**
	 * @param {string} key
	 */
	async delete(key, objectStoreName = this.#objectStoreNames[0]) {
		if (currentForcePendingPromise) await currentForcePendingPromise;
		return this.#db.delete(objectStoreName, key);
	}

	deleteDb() {
		const db = databases.get(this.#dbName);
		if (db) db.deleteDb();
		databases.delete(this.#dbName);
	}

	entries(objectStoreName = this.#objectStoreNames[0]) {
		return this.#db.entries(objectStoreName);
	}
}

const cast = /** @type {typeof MockIndexedDbUtil & typeof import("../../../../src/mod.js").IndexedDbUtil & (new (...args: any) => (MockIndexedDbUtil & import("../../../../src/mod.js").IndexedDbUtil))} */ (MockIndexedDbUtil);
export { cast as IndexedDbUtil };
