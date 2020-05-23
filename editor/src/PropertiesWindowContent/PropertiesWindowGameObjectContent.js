import PropertiesWindowContent from "./PropertiesWindowContent.js";
import {GameObject, Vector3} from "../../../../src/index.js";
import PropertiesTreeView from "../UI/PropertiesTreeView/PropertiesTreeView.js";

export default class PropertiesWindowGameObjectContent extends PropertiesWindowContent{
	constructor(){
		super();

		this.currentSelection = null;

		this.treeView = new PropertiesTreeView();
		this.el.appendChild(this.treeView.el);

		let gameObjectSection = this.treeView.addCollapsable("GameObject");
		this.positionProperty = gameObjectSection.addItem({
			label: "Position",
			type: "Vector3",
		});
		this.positionProperty.onValueChange(newValue => {
			for(const obj of this.currentSelection){
				obj.pos.set(newValue);
			}
		});
		this.rotationProperty = gameObjectSection.addItem({
			label: "Rotation",
			type: "Vector3",
		});
		this.scaleProperty = gameObjectSection.addItem({
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
		return [GameObject];
	}

	selectionChanged(selectedObjects){
		this.currentSelection = selectedObjects;
		this.positionProperty.setValue(selectedObjects[0].pos);
		this.componentsSection.clearChildren();
		let componentGroups = [];
		for(const object of selectedObjects){
			for(const component of object.components){
				componentGroups.push(component);
			}
		}
		for(const componentGroup of componentGroups){
			this.componentsSection.addCollapsable("component");
		}
	}
}
