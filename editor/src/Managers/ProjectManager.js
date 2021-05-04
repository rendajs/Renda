import editor from "../editorInstance.js";
import EditorFileSystemNative from "../Util/FileSystems/EditorFileSystemNative.js";
import EditorFileSystemIndexedDB from "../Util/FileSystems/EditorFileSystemIndexedDB.js";
import AssetManager from "../Assets/AssetManager.js";
import IndexedDbUtil from "../Util/IndexedDbUtil.js";

export default class ProjectManager{
	constructor(){
		this.currentProjectFileSystem = null;
		this.assetManager = null;

		this.tmpNativeHandleDb = new IndexedDbUtil("tmpNFShandles");

		this.onExternalChangeCbs = new Set();
		window.addEventListener("focus", () => this.suggestCheckExternalChanges());
		document.addEventListener("visibilitychange", () => {
			if(document.visibilityState === "visible"){
				this.suggestCheckExternalChanges();
			}
		});
	}

	openProject(fileSystem){
		this.currentProjectFileSystem = fileSystem;
		//todo remove this event when opening a new fileSystem
		fileSystem.onExternalChange(e => {
			for(const cb of this.onExternalChangeCbs){
				cb(e);
			}
		});
		editor.windowManager.reloadCurrentWorkspace();
		this.reloadAssetManager();
	}

	reloadAssetManager(){
		if(this.assetManager){
			this.assetManager.destructor();
		}
		this.assetManager = new AssetManager();
	}

	async openProjectFromLocalDirectory(){
		const fileSystem = await EditorFileSystemNative.openUserDir();
		this.tmpNativeHandleDb.set("lastHandle", fileSystem.handle);
		this.openProject(fileSystem);
	}

	async openRecentProjectHandle(){
		const handle = await this.tmpNativeHandleDb.get("lastHandle");
		if(handle){
			const fileSystem = new EditorFileSystemNative(handle);
			this.openProject(fileSystem);
		}
	}

	async openDb(){
		let fileSystem = new EditorFileSystemIndexedDB("test project");
		this.openProject(fileSystem);
	}

	onExternalChange(cb){
		this.onExternalChangeCbs.add(cb);
	}

	removeOnExternalChange(cb){
		this.onExternalChangeCbs.delete(cb);
	}

	suggestCheckExternalChanges(){
		if(this.currentProjectFileSystem){
			this.currentProjectFileSystem.suggestCheckExternalChanges();
		}
	}
}
