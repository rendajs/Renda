import ComponentGizmos from "./ComponentGizmos.js";
import {DefaultComponentTypes, defaultComponentTypeManager, LightIconGizmo} from "../../../../src/index.js";

export default class ComponentGizmosLight extends ComponentGizmos{

	static componentType = DefaultComponentTypes.light;
	static componentNamespace = defaultComponentTypeManager.builtInNamespace;
	static requiredGizmos = [LightIconGizmo];

	constructor(){
		super(...arguments);
	}
}
