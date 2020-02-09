import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";
import editor from "../../editorInstance.js";

export default class ContentWindowProject extends ContentWindow{
	constructor(){
		super();

		this.treeView = new TreeView();
		this.treeView.rowVisible = false;

		this.contentEl.appendChild(this.treeView.el);

		let fileSystem = editor.projectManager.currentProjectFileSystem;
		if(fileSystem){
			this.updateTreeView(this.treeView, fileSystem);
		}
	}

	static get windowName(){
		return "Project";
	}

	async updateTreeView(treeView, fileSystem, path = []){
		let fileTree = await fileSystem.readDir(path);
		for(const dir of fileTree.directories){
			let newTreeView = treeView.addChild();
			newTreeView.alwaysShowArrow = true;
			newTreeView.onArrowClick(_ => {
				let newPath = [...path, dir];
				this.updateTreeView(newTreeView, fileSystem, newPath);
			});
			newTreeView.name = dir;
			newTreeView.collapsed = true;
		}
		for(const file of fileTree.files){
			let newTreeView = treeView.addChild();
			newTreeView.name = file;
		}
	}
}
