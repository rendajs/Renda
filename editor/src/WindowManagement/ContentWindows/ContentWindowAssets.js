import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";
import editor from "../../editorInstance.js";

export default class ContentWindowAssets extends ContentWindow{
	constructor(){
		super();

		this.treeView = new TreeView({
			name: "test1",
			children:[],
		});

		this.contentEl.appendChild(this.treeView.el);
	}

	static get windowName(){
		return "Assets";
	}

	async updateTreeView(){
		let fileSystem = editor.projectManager.currentProjectFileSystem;
		let handlesTree = await fileSystem.getHandlesTree();
		let treeData = this.generateTreeData(handlesTree);
		this.treeView.updateData(treeData);
	}

	generateTreeData(handlesTree){
		let treeData = {
			name: handlesTree.handle.name,
		}
		let children = [];
		for(const dir of handlesTree.directories){
			children.push(this.generateTreeData(dir));
		}
		for(const file of handlesTree.files){
			children.push({name: file.name});
		}
		treeData.children = children;
		return treeData;
	}
}
