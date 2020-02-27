import editor from "../editorInstance.js";
import EditorFileSystemNative from "../Util/FileSystems/EditorFileSystemNative.js";
import EditorFileSystemIndexedDB from "../Util/FileSystems/EditorFileSystemIndexedDB.js";
import AssetManager from "./AssetManager.js";

export default class ProjectManager{
	constructor(){
		this.currentProjectFileSystem = null;
		this.assetManager = null;
		this.reloadAssetManager();
	}

	openProject(fileSystem){
		this.currentProjectFileSystem = fileSystem;
		editor.windowManager.reloadCurrentWorkspace();
	}

	reloadAssetManager(){
		if(this.assetManager){
			this.assetManager.destructor();
		}
		this.assetManager = new AssetManager();
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
