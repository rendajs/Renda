import PropertiesWindowContent from "./PropertiesWindowContent.js";
// import {Entity, Vector3, defaultComponentTypeManager, Mesh} from "../../../src/index.js";
import GuiTreeView from "../UI/GuiTreeView/GuiTreeView.js";
import Button from "../UI/Button.js";
import editor from "../editorInstance.js";

export default class PropertiesWindowAssetContent extends PropertiesWindowContent{
	constructor(){
		super();

		this.currentSelection = null;

		this.treeView = new GuiTreeView();
		this.el.appendChild(this.treeView.el);

		let entitySection = this.treeView.addCollapsable("File");
	}

	destructor(){
		this.treeView.destructor();
		super.destructor();
	}

	static get useForTypes(){
		return [];
	}

	selectionChanged(selectedObjects){
		this.currentSelection = selectedObjects;
		this.positionProperty.setValue(selectedObjects[0].pos);
		this.refreshComponents();
	}
}
