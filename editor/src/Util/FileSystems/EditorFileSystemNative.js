import EditorFileSystem from "./EditorFileSystem.js";

export default class EditorFileSystemNative extends EditorFileSystem{
	constructor(handle){
		super();
		this.handlesTree = null;
		this.buildHandlesTree(handle);
		this.onHandlesTreeBuiltCbs = [];
	}

	async buildHandlesTree(handle){
		this.handlesTree = await this.traverseHandle(handle);
	}

	async traverseHandle(parentHandle){
		let directory = {
			handle: parentHandle,
			directories: [],
			files: [],
		};
		for await(const handle of parentHandle.getEntries()){
			if(handle.isFile){
				directory.files.push(handle);
			}else if(handle.isDirectory){
				directory.directories.push(await this.traverseHandle(handle));
			}
		}
		return directory;
	}

	async getHandlesTree(){
		if(this.handlesTree) return this.handlesTree;
		return await new Promise(r => this.onHandlesTreeBuiltCbs.push(r));
	}
}
