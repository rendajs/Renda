import EditorFileSystem from "./EditorFileSystem.js";

export default class EditorFileSystemNative extends EditorFileSystem{
	constructor(handle){
		super();
		this.handle = handle;
	}

	static async openUserDir(){
		let directoryHandle = await window.chooseFileSystemEntries({
			type: "open-directory"
		});
		return new EditorFileSystemNative(directoryHandle);
	}

	async verifyHandlePermission(handle, {
		prompt = true,
		writable = true,
		error = true,
	} = {}){
		const opts = {writable};
		if(await handle.queryPermission(opts) == "granted") return true;
		if(await handle.requestPermission(opts) == "granted") return true;
		if(error) throw new Error("Not enough file system permissions for this operation.");
		return false;
	}

	async getDirHandle(path = [], create = false){
		let handle = this.handle;
		for(const dirName of path){
			await this.verifyHandlePermission(handle, {writable: create});
			handle = await handle.getDirectory(dirName, {create})
		}
		return handle;
	}

	async getFileHandle(path = [], create = false){
		const {dirPath, fileName} = this.splitDirFileName(path);
		const dirHandle = await this.getDirHandle(dirPath, create);
		await this.verifyHandlePermission(dirHandle, {writable: create});
		return await dirHandle.getFile(fileName, {create});
	}

	async readDir(path = []){
		const handle = await this.getDirHandle(path);
		let result = {
			files: [],
			directories: [],
		}
		for await (const item of handle.getEntries()){
			if(item.isDirectory){
				result.directories.push(item.name);
			}else if(item.isFile){
				result.files.push(item.name);
			}
		}
		return result;
	}

	async createDir(path = []){
		return await this.getDirHandle(path, true);
	}

	async move(fromPath = [], toPath = []){
		//wait for this method to be added to the native file system api spec
	}

	splitDirFileName(path = []){
		const dirPath = path.slice(0, path.length - 1);
		const fileName = path[path.length - 1];
		return {dirPath, fileName};
	}

	async writeFile(path = [], file = null){
		const fileHandle = await this.getFileHandle(path, true);
		await this.verifyHandlePermission(fileHandle);
		const fileStream = await fileHandle.createWritable();
		if(!fileStream.locked){
			await fileStream.write(file);
			await fileStream.close();
		}
	}

	async readFile(path = []){
		const fileHandle = await this.getFileHandle(path);
		await this.verifyHandlePermission(fileHandle, {writable: false});
		return await fileHandle.getFile();
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
}
