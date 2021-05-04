import {toFormattedJsonString} from "../Util.js";

export default class EditorFileSystem{
	constructor(){
		this.onExternalChangeCbs = new Set();
	}

	//path should be an array of directory names
	async readDir(path = []){
		return {
			files: [], //DOMString array of file names
			directories: [], //DOMString array of directory names
		};
	}

	async createDir(path = []){}

	async move(fromPath = [], toPath = []){}

	async delete(path = [], recursive = false){}

	async readFile(path = []){}

	//file should be of type `File`
	//use writeText() for writing strings
	async writeFile(path = [], file = null){}

	async writeFileStream(path = [], keepExistingData = false){}

	async isFile(path = []){}

	async isDir(path = []){}

	async exists(path = []){
		const isFile = await this.isFile(path);
		const isDir = await this.isDir(path);
		return isFile || isDir;
	}

	onExternalChange(cb){
		this.onExternalChangeCbs.add(cb);
	}

	fireExternalChange(e){
		for(const cb of this.onExternalChangeCbs){
			cb(e);
		}
	}

	//external change events are not guaranteed to fire immediately
	//calling this method suggests that right now is a good time
	//to check for external changes
	suggestCheckExternalChanges(){}

	//This should return true if the user has permission to read (or write if specified) at the specified path.
	//This method should not trigger any ui pop ups asking the user for permissions when `prompt` is false.
	//If the file/directory does not exist, it should still return true when the highest
	//available directory in the path has permissions
	async getPermission(path = [], {
		writable = true,
		prompt = false,
	}){
		return true;
	}

	/*util functions*/
	async writeText(path = [], text = "", {
		type = "text/plain",
	} = {}){
		await this.writeFile(path, new File([text], "", {type}))
	}

	async readText(path = []){
		const file = await this.readFile(path);
		return await file.text();
	}

	async writeJson(path = [], json = {}){
		let jsonStr = toFormattedJsonString(json);
		await this.writeText(path, jsonStr, {type: "application/json"});
	}

	async readJson(path = []){
		let file = await this.readFile(path);
		if(file.type == "application/json"){
			let body = await file.text();
			let json = JSON.parse(body);
			return json;
		}
		return null;
	}

	//binary can be a File, Blob, ArrayBuffer or TypedArray
	async writeBinary(path = [], binary = null){
		const fileName = path[path.lenth - 1] || "";
		await this.writeFile(path, new File([binary], fileName))
	}
}
