import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";
import Button from "../../UI/Button.js";
import ButtonGroup from "../../UI/ButtonGroup.js";
import {Entity} from "../../../../src/index.js";
import ContentWindowEntityEditor from "./ContentWindowEntityEditor.js";

export default class ContentWindowOutliner extends ContentWindow{
	constructor(){
		super();

		this.treeView = new TreeView();
		this.treeView.draggable = true;
		this.treeView.renameable = true;
		this.contentEl.appendChild(this.treeView.el);
		this.treeView.addEventListener("selectionchange", this.onTreeViewSelectionChange.bind(this));
		this.treeView.addEventListener("namechange", this.onTreeViewNameChange.bind(this));

		this.linkedEntityEditor = null;

		let createEmptyButton = new Button({
			text: "Create Emtpy",
			onClick: _ => {
				this.createNewEmpty();
			}
		});
		this.addTopBarButton(createEmptyButton);

		this.setAvailableLinkedEntityEditor();
	}

	destructor(){
		super.destructor();
		this.treeView.destructor();
		this.treeView = null;
		this.linkedEntityEditor = null;
	}

	static get windowName(){
		return "Outliner";
	}

	setAvailableLinkedEntityEditor(){
		for(const entityEditor of editor.windowManager.getContentWindowsByType(ContentWindowEntityEditor)){
			this.setLinkedEntityEditor(entityEditor);
			break;
		}
	}

	setLinkedEntityEditor(linkedEntityEditor){
		this.linkedEntityEditor = linkedEntityEditor;
		this.updateTreeView();
	}

	updateTreeView(){
		let treeData = {};
		if(this.linkedEntityEditor && this.linkedEntityEditor.editingEntity){
			treeData = this.treeDataFromEntity(this.linkedEntityEditor.editingEntity);
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
		if(!this.linkedEntityEditor || !this.linkedEntityEditor.editingEntity) return;
		let rootEnt = this.linkedEntityEditor.editingEntity;
		let createdAny = false;
		//todo: use selection manager
		for(const indicesPath of this.treeView.getSelectionIndices()){
			let ent = rootEnt.getEntityByIndicesPath(indicesPath);
			let createdEnt = new Entity(name);
			ent.add(createdEnt);
			createdAny = true;
		}
		if(!createdAny){
			let createdEnt = new Entity(name);
			rootEnt.add(createdEnt);
		}
		this.updateTreeView();
	}

	getEntityByTreeViewItem(treeView){
		if(!this.linkedEntityEditor || !this.linkedEntityEditor.editingEntity) return null;
		let indicesPath = treeView.getIndicesPath();
		return this.linkedEntityEditor.editingEntity.getEntityByIndicesPath(indicesPath);
	}

	onTreeViewSelectionChange(changes){
		if(!this.linkedEntityEditor) return;
		let toIndices = name => {
			changes[name] = changes[name].map(t => this.getEntityByTreeViewItem(t));
		}
		toIndices("added");
		toIndices("removed");
		this.linkedEntityEditor.selectionManager.changeSelection(changes);
	}

	onTreeViewNameChange({changedElement}){
		let ent = this.getEntityByTreeViewItem(changedElement);
		ent.name = changedElement.name;
	}
}
