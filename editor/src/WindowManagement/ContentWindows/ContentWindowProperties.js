import ContentWindow from "./ContentWindow.js";
import TreeView from "../../UI/TreeView.js";
import Button from "../../UI/Button.js";
import {MeshComponent} from "../../../../src/index.js";

export default class ContentWindowProperties extends ContentWindow{
	constructor(){
		super();

		this.treeView = new TreeView();
		this.contentEl.appendChild(this.treeView.el);

		let addComponentButton = new Button({
			text: "Add Component",
			onClick: _ => {
				this.addComponent(MeshComponent);
			}
		});
		this.addTopBarButton(addComponentButton);

		this.linkedObjectEditor = null;
	}

	static get windowName(){
		return "Properties";
	}

	destructor(){
		super.destructor();

		this.treeView.destructor();
		this.treeView = null;
	}

	setGameObjectMode(objectEditor){
		this.linkedObjectEditor = objectEditor;
	}

	updateGameObjectPropertiesTreeView(){
		if(!this.linkedObjectEditor) return;
		let selectedObjects = this.linkedObjectEditor.selectionManager.currentSelectedObjects;
		let componentList = [];
		for(const object of selectedObjects){
			for(const component of object.components){
				componentList.push({
					type: component.constructor,
					instances: [component],
				});
			}
		}
		let treeData = {
			name: "components",
			children: componentList.map(c => {
				return {
					name: c.type.name,
				}
			}),
		}
		this.treeView.updateData(treeData);
		this.treeView.setRowVisible(false);
	}

	addComponent(componentType){
		if(!this.linkedObjectEditor) return;
		for(const obj of this.linkedObjectEditor.selectionManager.currentSelectedObjects){
			obj.addComponent(componentType);
		}
		this.updateGameObjectPropertiesTreeView();
	}
}
