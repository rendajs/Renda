import editor from "../editorInstance.js";
import EditorFileSystemNative from "../Util/FileSystems/EditorFileSystemNative.js";
import EditorFileSystemIndexedDB from "../Util/FileSystems/EditorFileSystemIndexedDB.js";

export default class ProjectManager{
	constructor(){
		this.currentProjectFileSystem = null;
	}

	openProject(fileSystem){
		this.currentProjectFileSystem = fileSystem;
		editor.windowManager.reloadCurrentWorkspace();
	}

	async openProjectFromLocalDirectory(){
		let fileSystem = await EditorFileSystemNative.openUserDir();
		this.openProject(fileSystem);
	}

	async openDb(){
		let fileSystem = new EditorFileSystemIndexedDB("test project");
		this.openProject(fileSystem);
	}
}
