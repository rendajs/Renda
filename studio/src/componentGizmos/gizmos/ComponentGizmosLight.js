import { ComponentGizmos } from "./ComponentGizmos.js";
import { LightComponent, LightIconGizmo } from "../../../../src/mod.js";

/**
 * @extends {ComponentGizmos<LightComponent, [LightIconGizmo]>}
 */
export class ComponentGizmosLight extends ComponentGizmos {
	static componentType = LightComponent;
	static requiredGizmos = [LightIconGizmo];
}
