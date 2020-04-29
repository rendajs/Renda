import EditorFileSystem from "./EditorFileSystem.js";
import IndexedDbUtil from "../IndexedDbUtil.js";

export default class EditorFileSystemIndexedDB extends EditorFileSystem{
	constructor(name){
		super();

		this.name = name;
		this.db = new IndexedDbUtil("fileSystem_"+this.name, "objects");

		//create root directory
		this.createDir();
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

	async readDir(path = []){
		let result = {
			files: [],
			directories: [],
		};

		return await this.db.get(this.pathToKey(path));
	}

	async createDir(path = []){
		if(path.length > 0){
			let parentPath = path.slice(0, path.length - 1);
			await this.createDir(parentPath);
			await this.db.getSet(this.pathToKey(parentPath), oldValue => {
				let newDirName = path[path.length - 1];
				if(!oldValue.directories.includes(newDirName)){
					oldValue.directories.push(newDirName);
				}
				return oldValue;
			});
		}
		await this.db.getSet(this.pathToKey(path), oldValue => {
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
