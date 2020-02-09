import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";
import editor from "../../editorInstance.js";

export default class ContentWindowProject extends ContentWindow{
	constructor(){
		super();

		this.treeView = new TreeView();
		this.treeView.rowVisible = false;

		this.contentEl.appendChild(this.treeView.el);

		this.updateTreeView();
	}

	static get windowName(){
		return "Project";
	}

	async updateTreeView(){
		let fileSystem = editor.projectManager.currentProjectFileSystem;
		if(fileSystem){
			let fileTree = await fileSystem.readDir();
			for(const dir of fileTree.directories){
				let treeView = this.treeView.addChild();
				treeView.alwaysShowArrow = true;
				treeView.name = dir;
			}
			for(const file of fileTree.files){
				let treeView = this.treeView.addChild();
				treeView.name = file;
			}
		}
	}
}
