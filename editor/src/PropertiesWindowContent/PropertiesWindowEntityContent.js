import PropertiesWindowContent from "./PropertiesWindowContent.js";
import {
	Entity, Vector3, defaultComponentTypeManager,
	ComponentPropertyFloat,
	ComponentPropertyBool,
	ComponentPropertyAsset,
	ComponentPropertyArray,
} from "../../../src/index.js";
import GuiTreeView from "../UI/GuiTreeView/GuiTreeView.js";
import Button from "../UI/Button.js";
import editor from "../editorInstance.js";

export default class PropertiesWindowEntityContent extends PropertiesWindowContent{
	constructor(){
		super();

		this.currentSelection = null;

		this.treeView = new GuiTreeView();
		this.el.appendChild(this.treeView.el);

		let entitySection = this.treeView.addCollapsable("Entity");
		this.positionProperty = entitySection.addItem({
			label: "Position",
			type: "Vector3",
		});
		this.positionProperty.onValueChange(newValue => {
			for(const obj of this.currentSelection){
				obj.pos.set(newValue);
			}
		});
		this.rotationProperty = entitySection.addItem({
			label: "Rotation",
			type: "Vector3",
		});
		this.scaleProperty = entitySection.addItem({
			label: "Scale",
			type: "Vector3",
		});

		this.componentsSection = this.treeView.addCollapsable("Components");
		let createComponentButton = new Button({
			text: "+",
			onClick: _ => {
				let menu = editor.contextMenuManager.createContextMenu();
				for(const component of defaultComponentTypeManager.getAllComponents()){
					menu.addItem(component.type, _ => {
						for(const obj of this.currentSelection){
							obj.addComponent(component.type);
						}
						this.refreshComponents();
						this.componentsSection.collapsed = false;
					});
				}

				menu.setPos(createComponentButton, "top left");
			}
		});
		this.componentsSection.addButton(createComponentButton)
	}

	destructor(){
		this.treeView.destructor();
		this.positionProperty = null;
		this.rotationProperty = null;
		this.scaleProperty = null;
		super.destructor();
	}

	static get useForTypes(){
		return [Entity];
	}

	selectionChanged(selectedObjects){
		this.currentSelection = selectedObjects;
		this.positionProperty.setValue(selectedObjects[0].pos);
		this.refreshComponents();
	}

	refreshComponents(){
		this.componentsSection.clearChildren();
		let componentGroups = [];
		for(const entity of this.currentSelection){
			for(const component of entity.components){
				componentGroups.push(component);
			}
		}
		for(const componentGroup of componentGroups){
			let componentUI = this.componentsSection.addCollapsable(componentGroup.constructor.componentName);
			for(const [propertyName, property] of componentGroup._componentProperties){
				let type = "";
				let guiItemOpts = {
					value: property.value,
				}
				if(property instanceof ComponentPropertyFloat){
					type = "float";
				}else if(property instanceof ComponentPropertyBool){
					type = "bool";
				}else if(property instanceof ComponentPropertyAsset){
					type = "asset";
					guiItemOpts.supportedAssetTypes = [property.assetType];
				}else if(property instanceof ComponentPropertyArray){
					type = "array";
					guiItemOpts.arrayTypeOpts = property.arrayTypeOpts;
				}
				const addedItem = componentUI.addItem({
					label: propertyName,
					type, guiItemOpts,
				});
				addedItem.onValueChange(newValue => {
					console.log("newValue:", newValue);
				});
			}
		}
	}
}
