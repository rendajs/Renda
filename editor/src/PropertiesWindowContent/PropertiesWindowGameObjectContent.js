import PropertiesWindowContent from "./PropertiesWindowContent.js";
import {GameObject, Vector3} from "../../../../src/index.js";

export default class PropertiesWindowGameObjectContent extends PropertiesWindowContent{
	constructor(){
		super();
	}

	static get useForTypes(){
		return [GameObject];
	}

	selectionChanged(selectedObjects){

	}
}
