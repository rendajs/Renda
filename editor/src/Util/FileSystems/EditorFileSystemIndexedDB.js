import EditorFileSystem from "./EditorFileSystem.js";

export default class EditorFileSystemIndexedDB extends EditorFileSystem{
	constructor(name){
		super();

		this.name = name;
		this.db = null;
		this.openDb();
		this.onOpenDbCbs = [];
	}

	get dbName(){
		return "fileSystem_"+this.name;
	}

	async openDb(){
		let dbRequest = indexedDB.open(this.dbName);
		dbRequest.onupgradeneeded = (e) => {
			dbRequest.result.createObjectStore("files");
			dbRequest.result.createObjectStore("tree");
		};
		await new Promise(r => dbRequest.onsuccess = r);
		this.db = dbRequest.result;

		//create root directory
		await this.createDir();

		for(const cb of this.onOpenDbCbs){
			cb(this.db);
		}
		this.onOpenDbCbs = null;
	}

	async getDb(){
		if(this.db) return this.db;
		return new Promise(r => this.onOpenDbCbs.push(r));
	}

	pathToKey(path = []){
		let escapedPath = path.map(name => name.replace(/\//g,"\\/"));
		return "/"+escapedPath.join("/");
	}

	async promisifyIdbRequest(idbRequest){
		return await new Promise((resolve, reject) => {
			idbRequest.onsuccess = _ => {
				resolve(idbRequest.result)
			};
			idbRequest.onerror = reject;
		})
	}

	async getTree(path = []){
		let db = await this.getDb();
		let transaction = db.transaction("tree", "readonly");
		let objectStore = transaction.objectStore("tree");
		let getRequest = objectStore.get(this.pathToKey(path));
		return await this.promisifyIdbRequest(getRequest);
	}

	async getSetTree(path, setCb){
		let key = this.pathToKey(path);
		let db = await this.getDb();
		let transaction = db.transaction("tree", "readwrite");
		let objectStore = transaction.objectStore("tree");
		let cursorRequest = objectStore.openCursor(key);
		await this.promisifyIdbRequest(cursorRequest);
		let cursor = cursorRequest.result;

		if(cursor){
			let newVal = setCb(cursor.value);
			let updateRequest = cursor.update(newVal);
			await this.promisifyIdbRequest(updateRequest);
		}else{
			let putRequest = objectStore.put(setCb(null), key);
			await this.promisifyIdbRequest(putRequest);
		}
	}

	async setTree(path, value){
		await this.getSetTree(path, _ => value);
	}

	async readDir(path = []){
		let result = {
			files: [],
			directories: [],
		};

		return await this.getTree(path);
	}

	async createDir(path = []){
		if(path.length > 0){
			let parentPath = path.slice(0, path.length - 1);
			await this.createDir(parentPath);
			await this.getSetTree(parentPath, oldValue => {
				let newDirName = path[path.length - 1];
				if(!oldValue.directories.includes(newDirName)){
					oldValue.directories.push(newDirName);
				}
				return oldValue;
			});
		}
		await this.getSetTree(path, oldValue => {
			if(!oldValue){
				oldValue = {
					files: [],
					directories: [],
				};
			}
			return oldValue;
		});
	}
}
