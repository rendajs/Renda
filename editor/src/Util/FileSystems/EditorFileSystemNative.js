import EditorFileSystem from "./EditorFileSystem.js";
import {SingleInstancePromise} from "../../../../src/index.js";

export default class EditorFileSystemNative extends EditorFileSystem{
	constructor(handle){
		super();
		this.handle = handle;

		this.watchTree = new Map();
		this.updateWatchTreeInstance = new SingleInstancePromise(async _=> await this.updateWatchTree(), {once: false});
	}

	static async openUserDir(){
		let directoryHandle = await window.showDirectoryPicker();
		return new EditorFileSystemNative(directoryHandle);
	}

	async queryPermission(path = [], {
		writable = true,
	} = {}){
		let handle = this.handle;
		for(let i=0; i<=path.length; i++){
			const hasPermission = await this.verifyHandlePermission(handle, {writable, prompt: false, error: false});
			if(!hasPermission) return false;

			if(i == path.length) return true;

			const dirName = path[i];
			const isLast = i == path.length - 1;
			try{
				handle = await handle.getDirectoryHandle(dirName);
			}catch(e){
				if(e.name == "TypeMismatchError" || e.name == "NotFoundError"){
					if(isLast){
						try{
							handle = await handle.getFileHandle(dirName);
						}catch(e){
							if(e.name == "TypeMismatchError" || e.name == "NotFoundError"){
								return true;
							}else{
								return false;
							}
						}
					}else{
						return true;
					}
				}else{
					return false;
				}
			}
		}
	}

	async verifyHandlePermission(handle, {
		prompt = true,
		writable = true,
		error = true,
	} = {}){
		const opts = {writable};
		if(await handle.queryPermission(opts) == "granted") return true;
		if(prompt){
			if(await handle.requestPermission(opts) == "granted") return true;
		}
		if(error) throw new Error("Not enough file system permissions for this operation.");
		return false;
	}

	async getDirHandle(path = [], create = false){
		let handle = this.handle;
		for(const dirName of path){
			await this.verifyHandlePermission(handle, {writable: create});
			handle = await handle.getDirectoryHandle(dirName, {create});
		}
		return handle;
	}

	async getFileHandle(path = [], create = false){
		const {dirPath, fileName} = this.splitDirFileName(path);
		const dirHandle = await this.getDirHandle(dirPath, create);
		await this.verifyHandlePermission(dirHandle, {writable: create});
		return await dirHandle.getFileHandle(fileName, {create});
	}

	async readDir(path = []){
		const handle = await this.getDirHandle(path);
		let result = {
			files: [],
			directories: [],
		}
		for await (const [name, item] of handle.entries()){
			if(item.kind == "directory"){
				result.directories.push(name);
			}else if(item.kind == "file"){
				result.files.push(name);
			}
		}
		return result;
	}

	async createDir(path = []){
		return await this.getDirHandle(path, true);
	}

	async move(fromPath = [], toPath = []){
		if(await this.isDir(fromPath)){
			throw new Error("not yet implemented");
		}
		const file = await this.readFile(fromPath);
		await this.writeFile(toPath, file);
		await this.delete(fromPath);
	}

	async delete(path = [], recursive = false){
		const handle = await this.handle;
		for(const [i, name] of path.entries()){
			await this.verifyHandlePermission(handle);
			if(i == path.length - 1){
				await this.verifyHandlePermission(handle);
				await handle.removeEntry(name, {recursive});
			}else{
				handle = await handle.getDirectoryHandle(name);
			}
		}
	}

	splitDirFileName(path = []){
		const dirPath = path.slice(0, path.length - 1);
		const fileName = path[path.length - 1];
		return {dirPath, fileName};
	}

	async readFile(path = []){
		const fileHandle = await this.getFileHandle(path);
		await this.verifyHandlePermission(fileHandle, {writable: false});
		return await fileHandle.getFile();
	}

	async writeFile(path = [], file = null){
		const fileStream = await this.writeFileStream(path);
		if(!fileStream.locked){
			await fileStream.write(file);
			await fileStream.close();
		}
	}

	async writeFileStream(path = [], keepExistingData = false){
		const fileHandle = await this.getFileHandle(path, true);
		await this.verifyHandlePermission(fileHandle);
		const fileStream = await fileHandle.createWritable({keepExistingData});
		return fileStream;
	}

	async isFile(path = []){
		try{
			await this.getFileHandle(path);
		}catch(e){
			if(e.name == "TypeMismatchError" || e.name == "NotFoundError"){
				return false;
			}
		}
		return true;
	}

	async isDir(path = []){
		try{
			await this.getDirHandle(path);
		}catch(e){
			if(e.name == "TypeMismatchError" || e.name == "NotFoundError"){
				return false;
			}
		}
		return true;
	}

	//todos:
	//-don't fire when obtaining read permissions
	//-don't fire when making a change from this application
	//-fire events when deleting a file
	//-fire events when creating a directory
	async suggestCheckExternalChanges(){
		this.updateWatchTreeInstance.run(true);
	}

	async updateWatchTree(){
		const collectedChanges = [];

		await this.traverseWatchTree(this.watchTree, this.handle, collectedChanges);

		for(const change of collectedChanges){
			this.fireExternalChange(change);
		}
	}

	async traverseWatchTree(watchTree, dirHandle, collectedChanges, traversedPath = []){
		if(!await this.verifyHandlePermission(dirHandle, {prompt: false, writable: false, error: false})){
			return;
		}
		for await (const [name, handle] of dirHandle.entries()){
			if(!await this.verifyHandlePermission(handle, {prompt: false, writable: false, error: false})){
				continue;
			}
			if(handle.kind == "file"){
				const file = await handle.getFile();
				const lastModified = file.lastModified;
				if(!watchTree.has(name) || watchTree.get(name) < lastModified){
					watchTree.set(name, lastModified);
					collectedChanges.push({
						kind: handle.kind,
						path: [...traversedPath, name],
					});
				}
			}else if(handle.kind == "directory"){
				let dirWatchTree = watchTree.get(name);
				if(!dirWatchTree){
					dirWatchTree = new Map();
					watchTree.set(name, dirWatchTree);
				}
				const newTraversedPath = [...traversedPath, name];
				await this.traverseWatchTree(dirWatchTree, handle, collectedChanges, newTraversedPath);
			}
		}
	}
}
