import PropertiesWindowContent from "./PropertiesWindowContent.js";
import {GameObject, Vector3} from "../../../../src/index.js";
import PropertiesGUI from "../UI/PropertiesGUI/PropertiesGUI.js";

export default class PropertiesWindowGameObjectContent extends PropertiesWindowContent{
	constructor(){
		super();

		this.propertiesGUI = new PropertiesGUI();
		this.el.appendChild(this.propertiesGUI.el);
		this.propertiesGUI.addProperty({label: "Position"});
		this.propertiesGUI.addProperty({label: "Rotation"});
		this.propertiesGUI.addProperty({label: "Scale"});
		this.propertiesGUI.addCollapsable({displayName:"Transform"});
	}

	static get useForTypes(){
		return [GameObject];
	}

	selectionChanged(selectedObjects){

	}
}
