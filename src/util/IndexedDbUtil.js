/**
 * @typedef IndexedDbUtilOptions
 * @property {string[]} [objectStoreNames] List of object store names that will be used.
 */

export class IndexedDbUtil {
	/**
	 * @param {string} dbName The name of the database.
	 * @param {IndexedDbUtilOptions} options
	 */
	constructor(dbName = "keyValuesDb", {
		objectStoreNames = ["keyValues"],
	} = {}) {
		this.dbName = dbName;
		this.objectStoreNames = objectStoreNames;

		const dbRequest = indexedDB.open(dbName);
		dbRequest.onupgradeneeded = () => {
			for (const name of objectStoreNames) {
				dbRequest.result.createObjectStore(name);
			}
		};
	}

	/**
	 * @template T
	 * @param {IDBRequest<T>} request
	 * @returns {Promise<T>}
	 */
	async promisifyRequest(request) {
		if (request.readyState == "done") return request.result;
		return await new Promise((resolve, reject) => {
			request.onsuccess = () => {
				resolve(request.result);
			};
			request.onerror = reject;
		});
	}

	async deleteDb() {
		await this.promisifyRequest(indexedDB.deleteDatabase(this.dbName));
	}

	/**
	 * @param {string} key The key to search for.
	 * @param {string} objectStoreName The object store to search in.
	 * @returns {Promise<*>} The value of the key.
	 */
	async get(key, objectStoreName = this.objectStoreNames[0]) {
		const request = indexedDB.open(this.dbName);
		const db = await this.promisifyRequest(request);
		const transaction = db.transaction(objectStoreName, "readonly");
		const objectStore = transaction.objectStore(objectStoreName);
		const getRequest = objectStore.get(key);
		return await this.promisifyRequest(getRequest);
	}

	/**
	 * Sets a value for a key.
	 * @param {string} key The key to save at.
	 * @param {*} value The object to save.
	 * @param {string} objectStoreName The object store to save in.
	 * @returns {Promise<void>}
	 */
	set(key, value, objectStoreName = this.objectStoreNames[0]) {
		return this.getSet(key, () => {
			return value;
		}, objectStoreName);
	}

	/**
	 * Replaces the value of the key with the value returned by the callback.
	 * Locks the value between read and write.
	 * The parameter of the callback will be undefined if the key does not exist
	 * yet, otherwise it will be the value of the key.
	 * @template T
	 * @param {string} key The key to save at.
	 * @param {(value: T | undefined) => T} cb The function to call to get the replaced value to save.
	 * @param {string} objectStoreName The object store to save in.
	 * @param {boolean} deleteEntry If true, deletes the entry instead of setting it.
	 * @returns {Promise<void>}
	 */
	async getSet(key, cb, objectStoreName = this.objectStoreNames[0], deleteEntry = false) {
		const request = indexedDB.open(this.dbName);
		const db = await this.promisifyRequest(request);
		const transaction = db.transaction(objectStoreName, "readwrite");
		const objectStore = transaction.objectStore(objectStoreName);
		const cursorRequest = objectStore.openCursor(key);
		const cursor = await this.promisifyRequest(cursorRequest);
		if (cursor) {
			if (deleteEntry) {
				const cursorRequest = cursor.delete();
				await this.promisifyRequest(cursorRequest);
			} else {
				const newVal = cb(cursor.value);
				const cursorRequest = cursor.update(newVal);
				await this.promisifyRequest(cursorRequest);
			}
		} else {
			const putRequest = objectStore.put(cb(undefined), key);
			await this.promisifyRequest(putRequest);
		}
	}

	/**
	 * Deletes an object.
	 * @param {string} key The key to delete.
	 * @param {string} objectStoreName The object store to search in.
	 * @returns {Promise<void>}
	 */
	async delete(key, objectStoreName = this.objectStoreNames[0]) {
		await this.getSet(key, () => {}, objectStoreName, true);
	}
}
