import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";
import Button from "../../UI/Button.js";
import ButtonGroup from "../../UI/ButtonGroup.js";
import {GameObject} from "../../../../src/index.js";
import ContentWindowObjectEditor from "./ContentWindowObjectEditor.js";

export default class ContentWindowOutliner extends ContentWindow{
	constructor(){
		super();

		this.treeView = new TreeView();
		this.contentEl.appendChild(this.treeView.el);
		this.treeView.onSelectedChange(this.onTreeViewSelectionChange.bind(this));

		this.linkedObjectEditor = null;

		let createEmptyButton = new Button({
			text: "Create Emtpy",
			onClick: _ => {
				this.createNewEmpty();
			}
		});
		this.addTopBarButton(createEmptyButton);

		this.setAvailableLinkedObjectEditor();
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

	setAvailableLinkedObjectEditor(){
		for(const objectEditor of editor.windowManager.getContentWindowsByType(ContentWindowObjectEditor)){
			this.setLinkedObjectEditor(objectEditor);
			break;
		}
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
		//todo: use selection manager
		for(const indicesPath of this.treeView.getSelectionIndices()){
			let obj = rootObj.getObjectByIndicesPath(indicesPath);
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

	getObjectByTreeViewItem(treeView){
		if(!this.linkedObjectEditor || !this.linkedObjectEditor.editingObject) return null;
		let indicesPath = treeView.getIndicesPath();
		return this.linkedObjectEditor.editingObject.getObjectByIndicesPath(indicesPath);
	}

	onTreeViewSelectionChange(changes){
		if(!this.linkedObjectEditor) return;
		let toIndices = name => {
			changes[name] = changes[name].map(t => this.getObjectByTreeViewItem(t));
		}
		toIndices("added");
		toIndices("removed");
		this.linkedObjectEditor.selectionManager.changeSelection(changes);
	}
}
