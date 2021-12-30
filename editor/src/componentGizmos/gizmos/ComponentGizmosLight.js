import {ComponentGizmos} from "./ComponentGizmos.js";
import {LightComponent, LightIconGizmo} from "../../../../src/mod.js";

export class ComponentGizmosLight extends ComponentGizmos {
	static componentType = LightComponent;
	static requiredGizmos = [LightIconGizmo];
}
