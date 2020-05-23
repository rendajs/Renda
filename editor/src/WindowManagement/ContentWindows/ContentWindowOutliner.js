import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";
import Button from "../../UI/Button.js";
import ButtonGroup from "../../UI/ButtonGroup.js";
import {Entity} from "../../../../src/index.js";
import ContentWindowObjectEditor from "./ContentWindowObjectEditor.js";

export default class ContentWindowOutliner extends ContentWindow{
	constructor(){
		super();

		this.treeView = new TreeView();
		this.treeView.draggable = true;
		this.treeView.renameable = true;
		this.contentEl.appendChild(this.treeView.el);
		this.treeView.addEventListener("selectionchange", this.onTreeViewSelectionChange.bind(this));
		this.treeView.addEventListener("namechange", this.onTreeViewNameChange.bind(this));

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
			treeData = this.treeDataFromEntity(this.linkedObjectEditor.editingObject);
		}
		this.treeView.updateData(treeData);
	}

	treeDataFromEntity(entity){
		let treeData = {};
		treeData.name = entity.name;
		treeData.children = [];
		for(const child of entity.getChildren()){
			treeData.children.push(this.treeDataFromEntity(child));
		}
		return treeData;
	}

	createNewEmpty(){
		this.createNew("Entity");
	}

	createNew(name, afterCreate = null){
		if(!this.linkedObjectEditor || !this.linkedObjectEditor.editingObject) return;
		let rootObj = this.linkedObjectEditor.editingObject;
		let createdAny = false;
		//todo: use selection manager
		for(const indicesPath of this.treeView.getSelectionIndices()){
			let obj = rootObj.getEntityByIndicesPath(indicesPath);
			let createdObject = new Entity(name);
			obj.add(createdObject);
			createdAny = true;
		}
		if(!createdAny){
			let createdObject = new Entity(name);
			rootObj.add(createdObject);
		}
		this.updateTreeView();
	}

	getObjectByTreeViewItem(treeView){
		if(!this.linkedObjectEditor || !this.linkedObjectEditor.editingObject) return null;
		let indicesPath = treeView.getIndicesPath();
		return this.linkedObjectEditor.editingObject.getEntityByIndicesPath(indicesPath);
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

	onTreeViewNameChange({changedElement}){
		let obj = this.getObjectByTreeViewItem(changedElement);
		obj.name = changedElement.name;
	}
}
