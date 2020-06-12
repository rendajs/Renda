export default class EditorFileSystem{
	constructor(){

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

	async writeFile(path = [], file = null){}

	async readFile(path = []){}

	async isFile(path = []){}

	async isDir(path = []){}

	/*util functions*/
	async writeJson(path = [], json = {}){
		let jsonStr = JSON.stringify(json);
		let file = new File([jsonStr], "", {type: "application/json"});
		await this.writeFile(path, file);
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
}
