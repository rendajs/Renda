import ComponentGizmos from "./ComponentGizmos.js";
import {DefaultComponentTypes, defaultComponentTypeManager, LightIconGizmo} from "../../../../src/index.js";

export default class ComponentGizmosLight extends ComponentGizmos{

	static componentType = DefaultComponentTypes.light;
	static componentNamespace = defaultComponentTypeManager.defaultNamespace;
	static requiredGizmos = [LightIconGizmo];

	constructor(){
		super(...arguments);
	}
}
