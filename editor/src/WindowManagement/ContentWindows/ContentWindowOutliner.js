import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";

export default class ContentWindowOutliner extends ContentWindow{
	constructor(){
		super();

		this.treeView = new TreeView({
			name: "test1",
			children:[
				{name:"test2"},
				{name:"test3"},
				{
					name:"test4",
					collapsed: true,
					children:[
						{name:"a"},
						{name:"b"},
						{name:"c"},
					],
				},
				{name:"test5"},
				{name:"test6"},
			],
		});

		this.linkedObjectEditor = null;

		this.contentEl.appendChild(this.treeView.el);
	}

	static get windowName(){
		return "Outliner";
	}

	setLinkedObjectEditor(linkedObjectEditor){
		this.linkedObjectEditor = linkedObjectEditor;
		this.updateTreeView();
	}

	updateTreeView(){
		let treeData = {};
		if(this.linkedObjectEditor && this.linkedObjectEditor.editingObject){
			treeData = this.treeDataFromGameObject(this.linkedObjectEditor.editingObject);
		}
		this.treeView.updateData(treeData);
	}

	treeDataFromGameObject(gameObject){
		let treeData = {};
		treeData.name = gameObject.name;
		treeData.children = [];
		for(const child of gameObject.getChildren()){
			treeData.children.push(this.treeDataFromGameObject(child));
		}
		return treeData;
	}
}
