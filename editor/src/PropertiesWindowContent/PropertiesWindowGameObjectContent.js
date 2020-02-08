import PropertiesWindowContent from "./PropertiesWindowContent.js";
import {GameObject, Vector3} from "../../../../src/index.js";
import PropertiesTreeView from "../UI/PropertiesTreeView/PropertiesTreeView.js";

export default class PropertiesWindowGameObjectContent extends PropertiesWindowContent{
	constructor(){
		super();

		this.treeView = new PropertiesTreeView();
		this.el.appendChild(this.treeView.el);

		let gameObjectSection = this.treeView.addCollapsable("GameObject");
		gameObjectSection.addItem({
			label: "Position",
			type: "Vector3",
		});
		gameObjectSection.addItem({
			label: "Rotation",
			type: "Vector3",
		});
		gameObjectSection.addItem({
			label: "Scale",
			type: "Vector3",
		});
	}

	static get useForTypes(){
		return [GameObject];
	}

	selectionChanged(selectedObjects){

	}
}
