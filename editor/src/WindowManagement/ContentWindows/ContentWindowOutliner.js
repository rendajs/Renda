import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";
import Button from "../../UI/Button.js";
import ButtonGroup from "../../UI/ButtonGroup.js";
import {GameObject} from "../../../../src/index.js";

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

		let createEmptyButton = new Button({
			text: "Create Emtpy",
			onClick: _ => {
				this.createNewEmpty();
			}
		});
		this.addTopBarButton(createEmptyButton);
	}

	destructor(){
		super.destructor();
		this.treeView.destructor();
		this.treeView = null;
		this.linkedObjectEditor = null;
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

	createNewEmpty(){
		this.createNew("GameObject");
	}

	createNew(name, afterCreate = null){
		if(!this.linkedObjectEditor || !this.linkedObjectEditor.editingObject) return;
		let rootObj = this.linkedObjectEditor.editingObject;
		let createdAny = false;
		for(const indexPath of this.treeView.getSelectionPaths()){
			let obj = rootObj.getObjectByIndexPath(indexPath);
			let createdObject = new GameObject(name);
			obj.add(createdObject);
			createdAny = true;
		}
		if(!createdAny){
			let createdObject = new GameObject(name);
			rootObj.add(createdObject);
		}
		this.updateTreeView();
	}
}
