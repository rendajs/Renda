export default class IndexedDbUtil {
	constructor(dbName = "keyValuesDb", objectStoreNames = ["keyValues"]) {
		this.dbName = dbName;
		this.objectStoreNames = objectStoreNames;

		this.supported = false;
		try {
			const dbRequest = indexedDB.open(dbName);
			dbRequest.onupgradeneeded = () => {
				for (const name of objectStoreNames) {
					dbRequest.result.createObjectStore(name);
				}
			};
			this.supported = true;
		} catch (e) {
			console.log("error while opening indexedDB: ", e);
		}
	}

	async promisifyRequest(request) {
		if (request.readyState == "done") return request.result;
		return await new Promise((resolve, reject) => {
			request.onsuccess = () => {
				resolve(request.result);
			};
			request.onerror = reject;
		});
	}

	getLocalStorageName(key, objectStoreName = this.objectStoreNames[0]) {
		return "indexedDBFallback-" + this.dbName + "-" + objectStoreName + "-" + key;
	}

	async get(key, objectStoreName = this.objectStoreNames[0]) {
		if (!this.supported) {
			let val = localStorage.getItem(this.getLocalStorageName(key, objectStoreName));
			try {
				val = JSON.parse(val);
			} catch (e) {
				val = null;
			}
			return val;
		}
		const request = await indexedDB.open(this.dbName);
		const db = await this.promisifyRequest(request);
		const transaction = db.transaction(objectStoreName, "readonly");
		const objectStore = transaction.objectStore(objectStoreName);
		const getRequest = objectStore.get(key);
		return await this.promisifyRequest(getRequest);
	}

	set(key, value, objectStoreName = this.objectStoreNames[0]) {
		return this.getSet(key, () => {
			return value;
		}, objectStoreName);
	}

	async getSet(key, cb, objectStoreName = this.objectStoreNames[0], deleteCursor = false) {
		if (!this.supported) {
			const newKey = this.getLocalStorageName(key, objectStoreName);
			let val = localStorage.getItem(newKey);
			try {
				val = JSON.parse(val);
			} catch (e) {
				val = null;
			}
			const newVal = cb(val);
			localStorage.setItem(newKey, JSON.stringify(newVal));
			return;
		}
		const request = indexedDB.open(this.dbName);
		const db = await this.promisifyRequest(request);
		const transaction = db.transaction(objectStoreName, "readwrite");
		const objectStore = transaction.objectStore(objectStoreName);
		const cursorRequest = objectStore.openCursor(key);
		const cursor = await this.promisifyRequest(cursorRequest);
		if (cursor) {
			if (deleteCursor) {
				const cursorRequest = cursor.delete();
				await this.promisifyRequest(cursorRequest);
			} else {
				const newVal = cb(cursor.value);
				const cursorRequest = cursor.update(newVal);
				await this.promisifyRequest(cursorRequest);
			}
		} else {
			const putRequest = objectStore.put(cb(null), key);
			await this.promisifyRequest(putRequest);
		}
	}

	delete(key, objectStoreName = this.objectStoreNames[0]) {
		this.getSet(key, () => {}, objectStoreName, true);
	}
}
