import PropertiesWindowContent from "./PropertiesWindowContent.js";
import {Entity, Vector3, ComponentPropertyFloat} from "../../../../src/index.js";
import PropertiesTreeView from "../UI/PropertiesTreeView/PropertiesTreeView.js";

export default class PropertiesWindowEntityContent extends PropertiesWindowContent{
	constructor(){
		super();

		this.currentSelection = null;

		this.treeView = new PropertiesTreeView();
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
		this.componentsSection.clearChildren();
		let componentGroups = [];
		for(const entity of selectedObjects){
			for(const component of entity.components){
				componentGroups.push(component);
			}
		}
		for(const componentGroup of componentGroups){
			let componentUI = this.componentsSection.addCollapsable(componentGroup.constructor.componentName);
			for(const [propertyName, property] of componentGroup._componentProperties){
				if(property instanceof ComponentPropertyFloat){
					componentUI.addItem({
						label: propertyName,
						type: "float",
						guiItemOpts: {
							value: property.value,
						},
					});
				}
			}
		}
	}
}
