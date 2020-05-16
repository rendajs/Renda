export default class IndexedDbUtil{
	constructor(dbName = "keyValuesDb", objectStoreNames = ["keyValues"]){
		this.dbName = dbName;
		this.objectStoreNames = objectStoreNames;

		this.supported = false;
		try{
			let dbRequest = indexedDB.open(dbName);
			dbRequest.onupgradeneeded = _ => {
				for(const name of objectStoreNames){
					dbRequest.result.createObjectStore(name);
				}
			};
			this.supported = true;
		}catch(e){
			console.log("error while opening indexedDB: ",e);
		}
	}

	async promisifyRequest(request){
		if(request.readyState == "done") return request.result;
		return await new Promise((resolve, reject) => {
			request.onsuccess = _ => {
				resolve(request.result)
			};
			request.onerror = reject;
		});
	}

	getLocalStorageName(key, objectStoreName = this.objectStoreNames[0]){
		return "indexedDBFallback-"+this.dbName+"-"+objectStoreName+"-"+key;
	}

	async get(key, objectStoreName = this.objectStoreNames[0]){
		if(!this.supported){
			let val = localStorage.getItem(this.getLocalStorageName(key, objectStoreName));
			try{
				val = JSON.parse(val);
			}catch(e){
				val = null;
			}
			return val;
		}
		let request = await indexedDB.open(this.dbName);
		let db = await this.promisifyRequest(request);
		let transaction = db.transaction(objectStoreName, "readonly");
		let objectStore = transaction.objectStore(objectStoreName);
		let getRequest = objectStore.get(key);
		return await this.promisifyRequest(getRequest);
	}

	set(key, value, objectStoreName = this.objectStoreNames[0]){
		return this.getSet(key, _ => {
			return value;
		}, objectStoreName);
	}

	async getSet(key, cb, objectStoreName = this.objectStoreNames[0], deleteCursor = false){
		if(!this.supported){
			let newKey = this.getLocalStorageName(key, objectStoreName);
			let val = localStorage.getItem(newKey);
			try{
				val = JSON.parse(val);
			}catch(e){
				val = null;
			}
			let newVal = cb(val);
			localStorage.setItem(newKey, JSON.stringify(newVal));
			return;
		}
		let request = indexedDB.open(this.dbName);
		let db = await this.promisifyRequest(request);
		let transaction = db.transaction(objectStoreName, "readwrite");
		let objectStore = transaction.objectStore(objectStoreName);
		let cursorRequest = objectStore.openCursor(key);
		let cursor = await this.promisifyRequest(cursorRequest);
		if(cursor){
			if(deleteCursor){
				let cursorRequest = cursor.delete();
				await this.promisifyRequest(cursorRequest);
			}else{
				let newVal = cb(cursor.value);
				let cursorRequest = cursor.update(newVal);
				await this.promisifyRequest(cursorRequest);
			}
		}else{
			let putRequest = objectStore.put(cb(null), key);
			await this.promisifyRequest(putRequest);
		}
	}

	delete(key, objectStoreName = this.objectStoreNames[0]){
		this.getSet(key, _ => {}, objectStoreName, true);
	}
}
