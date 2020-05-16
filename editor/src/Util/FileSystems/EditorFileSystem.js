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

	async writeFile(path = [], blob = null){}
}
