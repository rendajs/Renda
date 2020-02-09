export default class EditorFileSystem{
	constructor(){

	}

	//path should be an array of directory names
	async readDir(path = []){
		return {
			files: [],
			directories: [],
		};
	}
}
