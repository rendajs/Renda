import editor from "../editorInstance.js";
import EditorFileSystemNative from "../Util/FileSystems/EditorFileSystemNative.js";

export default class ProjectManager{
	constructor(){
		this.currentProjectFileSystem = null;
	}

	openProject(fileSystem){
		this.currentProjectFileSystem = fileSystem;
	}

	async openProjectFromLocalDirectory(){
		let directoryHandle = await window.chooseFileSystemEntries({
			type: "openDirectory"
		});
		let fileSystem = new EditorFileSystemNative(directoryHandle);
		this.openProject(fileSystem);
	}
}
