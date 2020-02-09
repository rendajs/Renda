import EditorFileSystem from "./EditorFileSystem.js";

export default class EditorFileSystemNative extends EditorFileSystem{
	constructor(handle){
		super();
		this.handle = handle;
	}

	async readDir(path = []){
		let handle = this.handle;
		for(const dirName of path){
			handle = await handle.getDirectory(dirName)
		}
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
}
