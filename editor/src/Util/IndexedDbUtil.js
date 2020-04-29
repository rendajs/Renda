export default class IndexedDbUtil{
	constructor(dbName = "keyValuesDb", objectStoreName = "keyValues"){
		this.dbName = dbName;
		this.objectStoreName = objectStoreName;

		this.supported = false;
		try{
			let dbRequest = indexedDB.open(dbName);
			dbRequest.onupgradeneeded = _ => {
				dbRequest.result.createObjectStore(objectStoreName);
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

	getLocalStorageName(key){
		return "indexedDBFallback-"+this.dbName+"-"+this.objectStoreName+"-"+key;
	}

	async get(key){
		if(!this.supported){
			let val = localStorage.getItem(this.getLocalStorageName(key));
			try{
				val = JSON.parse(val);
			}catch(e){
				val = null;
			}
			return val;
		}
		let request = await indexedDB.open(this.dbName);
		let db = await this.promisifyRequest(request);
		let transaction = db.transaction(this.objectStoreName, "readonly");
		let objectStore = transaction.objectStore(this.objectStoreName);
		let getRequest = objectStore.get(key);
		return await this.promisifyRequest(getRequest);
	}

	set(key,value){
		return this.getSet(key, _ => {
			return value;
		});
	}

	async getSet(key, cb){
		if(!this.supported){
			let newKey = this.getLocalStorageName(key);
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
		let transaction = db.transaction(this.objectStoreName, "readwrite");
		let objectStore = transaction.objectStore(this.objectStoreName);
		let cursorRequest = objectStore.openCursor(key);
		let cursor = await this.promisifyRequest(cursorRequest);
		if(cursor){
			let newVal = cb(cursor.value);
			let cursorRequest = cursor.update(newVal);
			await this.promisifyRequest(cursorRequest);
		}else{
			let putRequest = objectStore.put(cb(null), key);
			await this.promisifyRequest(putRequest);
		}
	}
}
