import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";
import editor from "../../editorInstance.js";
import Button from "../../UI/Button.js";

export default class ContentWindowProject extends ContentWindow{
	constructor(){
		super();

		let createDirButton = new Button({
			text: "New Dir",
			onClick: _ => {
				this.createNewDir();
			}
		});
		this.addTopBarButton(createDirButton);

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
			if(!treeView.includes(dir)){
				let newTreeView = treeView.addChild();
				newTreeView.alwaysShowArrow = true;
				newTreeView.onArrowClick(_ => {
					if(!newTreeView.collapsed){
						let newPath = [...path, dir];
						this.updateTreeView(newTreeView, fileSystem, newPath);
					}
				});
				newTreeView.name = dir;
				newTreeView.collapsed = true;
			}
		}
		for(const file of fileTree.files){
			let newTreeView = treeView.addChild();
			newTreeView.name = file;
		}
	}

	async createNewDir(){
		let fileSystem = editor.projectManager.currentProjectFileSystem;
		let selectedPath = [];
		let treeView = this.treeView;
		for(const selectedItem of this.treeView.getSelectedItems()){
			let selectionPath = selectedItem.getNamesPath();
			selectedPath = selectionPath.slice(1, selectionPath.length);
			treeView = selectedItem;
			break;
		}
		let newPath = [...selectedPath, "New Folder"];
		await fileSystem.createDir(newPath);
		await this.updateTreeView(treeView, fileSystem, selectedPath);
		treeView.collapsed = false;
	}
}
