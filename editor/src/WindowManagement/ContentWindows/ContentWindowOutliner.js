import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";
import Button from "../../UI/Button.js";
import ButtonGroup from "../../UI/ButtonGroup.js";
import {Entity} from "../../../../src/index.js";
import ContentWindowEntityEditor from "./ContentWindowEntityEditor.js";
import editor from "../../editorInstance.js";

export default class ContentWindowOutliner extends ContentWindow{

	static windowName = "outliner";

	constructor(){
		super();

		this.treeView = new TreeView();
		this.treeView.draggable = true;
		this.treeView.renameable = true;
		this.contentEl.appendChild(this.treeView.el);
		this.treeView.addEventListener("selectionchange", this.onTreeViewSelectionChange.bind(this));
		this.treeView.addEventListener("namechange", this.onTreeViewNameChange.bind(this));
		this.treeView.addEventListener("contextmenu", this.onTreeViewContextMenu.bind(this));

		this.linkedEntityEditor = null;

		let createEmptyButton = new Button({
			text: "Create Emtpy",
			onClick: () => {
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

	get selectionManager(){
		return this.linkedEntityEditor.selectionManager;
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
		changes.added = changes.added.map(treeView => this.getEntityByTreeViewItem(treeView));
		changes.removed = changes.removed.map(treeView => this.getEntityByTreeViewItem(treeView));
		this.selectionManager.changeSelection(changes);
	}

	onTreeViewNameChange({changedElement}){
		let ent = this.getEntityByTreeViewItem(changedElement);
		ent.name = changedElement.name;
	}

	onTreeViewContextMenu(e){
		const menu = e.showContextMenu();
		menu.createStructure([
			{text: "Delete", cb: () => {
				const entity = this.getEntityByTreeViewItem(e.clickedElement);
				entity.detachParent();
				this.updateTreeView();
				this.notifyEntityEditors(entity, "delete");
			}},
		]);
	}

	notifyEntityEditors(obj, type){
		if(!this.linkedEntityEditor) return;
		this.linkedEntityEditor.notifyEntityChanged(obj, type);
	}
}
