import ComponentGizmos from "./ComponentGizmos.js";
import {LightComponent, defaultComponentTypeManager, LightIconGizmo} from "../../../../src/index.js";

export default class ComponentGizmosLight extends ComponentGizmos{

	static componentType = LightComponent;
	static requiredGizmos = [LightIconGizmo];

	constructor(){
		super(...arguments);
	}
}
