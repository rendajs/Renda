import PropertiesWindowContent from "./PropertiesWindowContent.js";
import {Entity, Vec3, Quaternion, defaultComponentTypeManager, Mesh} from "../../../src/index.js";
import PropertiesTreeView from "../UI/PropertiesTreeView/PropertiesTreeView.js";
import Button from "../UI/Button.js";
import editor from "../editorInstance.js";
import ProjectAsset from "../Assets/ProjectAsset.js";
import ContentWindowEntityEditor from "../WindowManagement/ContentWindows/ContentWindowEntityEditor.js";

export default class PropertiesWindowEntityContent extends PropertiesWindowContent{
	constructor(){
		super();

		this.currentSelection = null;

		this.treeView = new PropertiesTreeView();
		this.el.appendChild(this.treeView.el);

		let entitySection = this.treeView.addCollapsable("Entity");
		this.positionProperty = entitySection.addItem({
			type: Vec3,
			guiOpts: {
				label: "Position",
			},
		});
		this.positionProperty.onValueChange(newValue => {
			for(const obj of this.currentSelection){
				obj.pos = newValue;
				this.notifyEntityEditors(obj, "transform");
			}
		});

		this.rotationProperty = entitySection.addItem({
			type: Vec3,
			guiOpts: {
				label: "Rotation",
			},
		});
		this.rotationProperty.onValueChange(newValue => {
			for(const obj of this.currentSelection){
				obj.rot.setFromAxisAngle(newValue);
				this.notifyEntityEditors(obj, "transform");
			}
		});

		this.scaleProperty = entitySection.addItem({
			type: Vec3,
			guiOpts: {
				label: "Scale",
			},
		});
		this.scaleProperty.onValueChange(newValue => {
			for(const obj of this.currentSelection){
				obj.scale = newValue;
				this.notifyEntityEditors(obj, "transform");
			}
		});

		this.componentsSection = this.treeView.addCollapsable("Components");
		let createComponentButton = new Button({
			text: "+",
			onClick: () => {
				let menu = editor.contextMenuManager.createContextMenu();
				for(const component of defaultComponentTypeManager.getAllComponents()){
					menu.addItem(component.name || component.uuid, {
						onClick: () => {
							for(const obj of this.currentSelection){
								obj.addComponent(component);
								this.notifyEntityEditors(obj, "component");
							}
							this.refreshComponents();
							this.componentsSection.collapsed = false;
						},
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
		this.rotationProperty.setValue(selectedObjects[0].rot.toAxisAngle())
		this.scaleProperty.setValue(selectedObjects[0].scale);
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
			const componentName = componentGroup.name || componentGroup.uuid;
			const componentUI = this.componentsSection.addCollapsable(componentName);
			const componentData = componentGroup.getComponentData();
			const serializableStructure = componentData?.properties;
			if(serializableStructure){
				componentUI.generateFromSerializableStructure(serializableStructure);
				componentUI.onChildValueChange(async e => {
					const propertyName = componentUI.getSerializableStructureKeyForEntry(e.changedEntry);
					let value = await this.mapDroppableGuiValues(e.newValue);
					componentGroup[propertyName] = value;
					this.notifyEntityEditors(componentGroup.entity, "componentProperty");
				});
				componentUI.fillSerializableStructureValues(componentGroup);
			}
		}
	}

	async mapDroppableGuiValues(value){
		if(value instanceof ProjectAsset){
			value = await value.getLiveAsset();
		}else if(Array.isArray(value)){
			const promises = [];
			for(const [i, item] of value.entries()){
				promises.push((async r => {
					const newValue = await this.mapDroppableGuiValues(item);
					value[i] = newValue;
				})());
			}
			await Promise.all(promises);
		}
		return value;
	}

	notifyEntityEditors(entity, type){
		for(const entityEditor of editor.windowManager.getContentWindowsByType(ContentWindowEntityEditor)){
			entityEditor.notifyEntityChanged(entity, type);
		}
	}
}
